const pool = require('../config/db');
const {
  isInsideNagpur,
  haversineDistanceMeters,
  getConfig,
  calculatePriorityScore,
  isOverdue,
  canTransition
} = require('./ruleEngine');

class ComplaintService {
  /**
   * File a complaint
   */
  async createComplaint(userId, { categoryId, wardId, locality, description, latitude, longitude }) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // 1. Nagpur bounds validation
    if (!isInsideNagpur(lat, lng)) {
      const err = new Error('Location must be within Nagpur');
      err.statusCode = 400;
      throw err;
    }

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // Fetch config & category
      const config = await getConfig(conn);
      const [categoryRows] = await conn.query('SELECT * FROM categories WHERE id = ?', [categoryId]);
      if (categoryRows.length === 0) {
        const err = new Error('Category not found');
        err.statusCode = 400;
        throw err;
      }
      const category = categoryRows[0];

      // Check ward exists
      const [wardRows] = await conn.query('SELECT * FROM wards WHERE id = ?', [wardId]);
      if (wardRows.length === 0) {
        const err = new Error('Ward not found');
        err.statusCode = 400;
        throw err;
      }

      // 2. Duplicate Detection
      // Look for non-closed parent complaints in the same category & ward within duplicate_window_days
      const windowDays = config.duplicate_window_days || 14;
      const radiusMeters = config.duplicate_radius_m || 150;

      const [candidateParents] = await conn.query(
        `SELECT id, latitude, longitude, affected_count, created_at, priority_score
         FROM complaints
         WHERE parent_id IS NULL
           AND status != 'Closed'
           AND ward_id = ?
           AND category_id = ?
           AND created_at >= NOW() - INTERVAL ? DAY`,
        [wardId, categoryId, windowDays]
      );

      let matchedParent = null;

      for (const parent of candidateParents) {
        const pLat = parseFloat(parent.latitude);
        const pLng = parseFloat(parent.longitude);
        const dist = haversineDistanceMeters(lat, lng, pLat, pLng);

        if (dist <= radiusMeters) {
          matchedParent = parent;
          break;
        }
      }

      if (matchedParent) {
        // MERGE AS DUPLICATE
        const [childRes] = await conn.query(
          `INSERT INTO complaints 
           (user_id, ward_id, category_id, locality, description, latitude, longitude, status, parent_id, affected_count, priority_score, is_overdue, reopen_count, closed_unverified)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?, 1, 0, 0, 0, 0)`,
          [userId, wardId, categoryId, locality, description, lat, lng, matchedParent.id]
        );

        const newChildId = childRes.insertId;

        // Increment parent's affected_count & recompute priority
        const newAffectedCount = matchedParent.affected_count + 1;
        const [parentDetails] = await conn.query('SELECT created_at FROM complaints WHERE id = ?', [matchedParent.id]);
        const parentCreated = new Date(parentDetails[0].created_at);
        const ageDays = Math.max(0, (Date.now() - parentCreated.getTime()) / (24 * 3600 * 1000));

        const newPriority = calculatePriorityScore({
          severityWeight: category.severity_weight,
          ageInDays: ageDays,
          affectedCount: newAffectedCount,
          priorityWAge: config.priority_w_age,
          priorityWAffected: config.priority_w_affected
        });

        await conn.query(
          'UPDATE complaints SET affected_count = ?, priority_score = ? WHERE id = ?',
          [newAffectedCount, newPriority, matchedParent.id]
        );

        // Status history for child
        await conn.query(
          `INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, note)
           VALUES (?, NULL, 'Open', ?, ?)`,
          [newChildId, userId, `Merged as duplicate of parent complaint #${matchedParent.id}`]
        );

        await conn.commit();

        return {
          merged: true,
          parentId: matchedParent.id,
          complaintId: newChildId,
          message: 'A similar complaint already exists nearby. Your report has been added to it.'
        };
      }

      // 3. NEW PARENT COMPLAINT
      const initialPriority = calculatePriorityScore({
        severityWeight: category.severity_weight,
        ageInDays: 0,
        affectedCount: 1,
        priorityWAge: config.priority_w_age,
        priorityWAffected: config.priority_w_affected
      });

      const [insertRes] = await conn.query(
        `INSERT INTO complaints 
         (user_id, ward_id, category_id, locality, description, latitude, longitude, status, parent_id, affected_count, priority_score, is_overdue, reopen_count, closed_unverified)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', NULL, 1, ?, 0, 0, 0)`,
        [userId, wardId, categoryId, locality, description, lat, lng, initialPriority]
      );

      const complaintId = insertRes.insertId;

      await conn.query(
        `INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, note)
         VALUES (?, NULL, 'Open', ?, 'Complaint submitted by citizen')`,
        [complaintId, userId]
      );

      await conn.commit();

      return {
        merged: false,
        complaintId,
        message: 'Complaint submitted successfully'
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Get single complaint by ID with live overdue recomputation, timeline history, and child reports
   */
  async getComplaintById(complaintId, currentUser) {
    const [rows] = await pool.query(
      `SELECT c.*,
              w.name AS ward_name,
              z.name AS zone_name,
              cat.name AS category_name,
              cat.sla_days,
              cat.severity_weight,
              u.name AS citizen_name,
              u.email AS citizen_email,
              u.phone AS citizen_phone
       FROM complaints c
       JOIN wards w ON c.ward_id = w.id
       JOIN zones z ON w.zone_id = z.id
       JOIN categories cat ON c.category_id = cat.id
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [complaintId]
    );

    if (rows.length === 0) {
      const err = new Error('Complaint not found');
      err.statusCode = 404;
      throw err;
    }

    const complaint = rows[0];

    // Authorization check
    if (currentUser.role === 'citizen') {
      // Citizen must be owner of this complaint OR owner of one of its children
      if (complaint.user_id !== currentUser.id) {
        const [childRows] = await pool.query(
          'SELECT id FROM complaints WHERE parent_id = ? AND user_id = ?',
          [complaint.id, currentUser.id]
        );
        if (childRows.length === 0) {
          const err = new Error('Forbidden: You do not have access to view this complaint');
          err.statusCode = 403;
          throw err;
        }
      }
    } else if (currentUser.role === 'officer') {
      // Officer must be head or assigned to this ward
      if (!currentUser.is_head && currentUser.ward_id !== complaint.ward_id) {
        const err = new Error('Forbidden: You can only view complaints for your assigned ward');
        err.statusCode = 403;
        throw err;
      }
    }

    // Recompute live overdue status
    const liveOverdue = isOverdue(complaint.created_at, complaint.sla_days, complaint.status);
    if (complaint.is_overdue !== (liveOverdue ? 1 : 0)) {
      await pool.query('UPDATE complaints SET is_overdue = ? WHERE id = ?', [liveOverdue ? 1 : 0, complaint.id]);
      complaint.is_overdue = liveOverdue ? 1 : 0;
    }

    // Status timeline
    const [history] = await pool.query(
      `SELECT sh.*, u.name AS changed_by_name, u.role AS changed_by_role
       FROM status_history sh
       LEFT JOIN users u ON sh.changed_by = u.id
       WHERE sh.complaint_id = ?
       ORDER BY sh.changed_at ASC, sh.id ASC`,
      [complaintId]
    );

    // Child complaints if this is a parent
    let children = [];
    if (complaint.parent_id === null) {
      const [childRows] = await pool.query(
        `SELECT c.id, c.locality, c.description, c.created_at, u.name AS citizen_name
         FROM complaints c
         JOIN users u ON c.user_id = u.id
         WHERE c.parent_id = ?
         ORDER BY c.created_at ASC`,
        [complaintId]
      );
      children = childRows;
    }

    const ageDays = Math.max(0, (Date.now() - new Date(complaint.created_at).getTime()) / (24 * 3600 * 1000));

    return {
      ...complaint,
      age_days: Math.round(ageDays * 10) / 10,
      latitude: parseFloat(complaint.latitude),
      longitude: parseFloat(complaint.longitude),
      history,
      children
    };
  }

  /**
   * Officer updates status
   */
  async updateStatusByOfficer(complaintId, officerUser, nextStatus, note = '') {
    const [rows] = await pool.query('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (rows.length === 0) {
      const err = new Error('Complaint not found');
      err.statusCode = 404;
      throw err;
    }

    const complaint = rows[0];

    // Ward check
    if (!officerUser.is_head && officerUser.ward_id !== complaint.ward_id) {
      const err = new Error('Forbidden: You can only update complaints within your assigned ward');
      err.statusCode = 403;
      throw err;
    }

    // State machine check
    const transitionCheck = canTransition(complaint.status, nextStatus, 'officer');
    if (!transitionCheck.allowed) {
      const err = new Error(transitionCheck.reason);
      err.statusCode = 409;
      throw err;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let resolvedAt = complaint.resolved_at;
      if (nextStatus === 'Pending Confirmation') {
        resolvedAt = new Date();
      }

      await conn.query(
        'UPDATE complaints SET status = ?, resolved_at = ? WHERE id = ?',
        [nextStatus, resolvedAt, complaintId]
      );

      await conn.query(
        `INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, note)
         VALUES (?, ?, ?, ?, ?)`,
        [complaintId, complaint.status, nextStatus, officerUser.id, note || `Status updated to ${nextStatus}`]
      );

      await conn.commit();
      return { success: true, status: nextStatus, resolvedAt };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Citizen confirms resolution -> Closed
   */
  async confirmResolution(complaintId, citizenUser) {
    const [rows] = await pool.query('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (rows.length === 0) {
      const err = new Error('Complaint not found');
      err.statusCode = 404;
      throw err;
    }

    const complaint = rows[0];

    // Only the original filer can confirm the parent
    if (complaint.user_id !== citizenUser.id) {
      const err = new Error('Forbidden: Only the original citizen who filed this complaint can confirm the resolution');
      err.statusCode = 403;
      throw err;
    }

    const transitionCheck = canTransition(complaint.status, 'Closed', 'citizen');
    if (!transitionCheck.allowed) {
      const err = new Error(transitionCheck.reason);
      err.statusCode = 409;
      throw err;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const closedAt = new Date();
      await conn.query(
        'UPDATE complaints SET status = "Closed", closed_at = ? WHERE id = ?',
        [closedAt, complaintId]
      );

      await conn.query(
        `INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, note)
         VALUES (?, 'Pending Confirmation', 'Closed', ?, 'Citizen confirmed resolution in citizen portal.')`,
        [complaintId, citizenUser.id]
      );

      await conn.commit();
      return { success: true, status: 'Closed', closedAt };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Citizen rejects resolution -> Reopened
   */
  async rejectResolution(complaintId, citizenUser, reason) {
    if (!reason || reason.trim().length < 10) {
      const err = new Error('Rejection reason must be at least 10 characters');
      err.statusCode = 400;
      throw err;
    }

    const [rows] = await pool.query('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (rows.length === 0) {
      const err = new Error('Complaint not found');
      err.statusCode = 404;
      throw err;
    }

    const complaint = rows[0];

    // Only original filer can reject
    if (complaint.user_id !== citizenUser.id) {
      const err = new Error('Forbidden: Only the original citizen who filed this complaint can reject the resolution');
      err.statusCode = 403;
      throw err;
    }

    const transitionCheck = canTransition(complaint.status, 'Reopened', 'citizen');
    if (!transitionCheck.allowed) {
      const err = new Error(transitionCheck.reason);
      err.statusCode = 409;
      throw err;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        'UPDATE complaints SET status = "Reopened", reopen_count = reopen_count + 1 WHERE id = ?',
        [complaintId]
      );

      await conn.query(
        `INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, note)
         VALUES (?, 'Pending Confirmation', 'Reopened', ?, ?)`,
        [complaintId, citizenUser.id, reason.trim()]
      );

      await conn.commit();
      return { success: true, status: 'Reopened', reopen_count: complaint.reopen_count + 1 };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Officer queue with filters, sorting by priority_score descending
   * Only parents count! Child complaints are excluded.
   */
  async getOfficerQueue(officerUser, filters = {}) {
    let query = `
      SELECT c.id, c.ward_id, c.category_id, c.locality, c.description,
             c.latitude, c.longitude, c.status, c.affected_count, c.priority_score,
             c.is_overdue, c.reopen_count, c.created_at, c.resolved_at,
             w.name AS ward_name,
             z.name AS zone_name,
             cat.name AS category_name,
             cat.sla_days,
             ROUND(TIMESTAMPDIFF(SECOND, c.created_at, NOW()) / 86400.0, 1) AS age_in_days
      FROM complaints c
      JOIN wards w ON c.ward_id = w.id
      JOIN zones z ON w.zone_id = z.id
      JOIN categories cat ON c.category_id = cat.id
      WHERE c.parent_id IS NULL
    `;

    const params = [];

    // Ward scoping: locked to officer's ward unless is_head
    if (!officerUser.is_head) {
      query += ' AND c.ward_id = ?';
      params.push(officerUser.ward_id);
    } else if (filters.ward_id) {
      query += ' AND c.ward_id = ?';
      params.push(filters.ward_id);
    }

    if (filters.category_id) {
      query += ' AND c.category_id = ?';
      params.push(filters.category_id);
    }

    if (filters.status) {
      query += ' AND c.status = ?';
      params.push(filters.status);
    }

    if (filters.overdue_only === 'true' || filters.overdue_only === true) {
      query += ' AND c.is_overdue = 1';
    }

    query += ' ORDER BY c.priority_score DESC, c.created_at ASC';

    const [rows] = await pool.query(query, params);

    return rows.map((r) => ({
      ...r,
      latitude: parseFloat(r.latitude),
      longitude: parseFloat(r.longitude),
      age_in_days: parseFloat(r.age_in_days)
    }));
  }

  /**
   * Citizen's complaints list
   */
  async getCitizenComplaints(userId, status = null) {
    let query = `
      SELECT c.*,
             w.name AS ward_name,
             z.name AS zone_name,
             cat.name AS category_name,
             cat.sla_days,
             ROUND(TIMESTAMPDIFF(SECOND, c.created_at, NOW()) / 86400.0, 1) AS age_in_days
      FROM complaints c
      JOIN wards w ON c.ward_id = w.id
      JOIN zones z ON w.zone_id = z.id
      JOIN categories cat ON c.category_id = cat.id
      WHERE (c.user_id = ? OR c.parent_id IN (SELECT p.id FROM complaints p WHERE p.user_id = ?))
    `;

    const params = [userId, userId];

    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    query += ' ORDER BY c.created_at DESC';

    const [rows] = await pool.query(query, params);
    return rows.map((r) => ({
      ...r,
      latitude: parseFloat(r.latitude),
      longitude: parseFloat(r.longitude),
      age_in_days: parseFloat(r.age_in_days)
    }));
  }

  /**
   * Officer map markers (ward locked unless head)
   */
  async getOfficerMapMarkers(officerUser, filters = {}) {
    let query = `
      SELECT c.id, c.ward_id, c.locality, c.latitude, c.longitude,
             c.status, c.is_overdue, c.affected_count, c.priority_score,
             c.created_at,
             w.name AS ward_name,
             cat.name AS category_name,
             cat.sla_days,
             ROUND(TIMESTAMPDIFF(SECOND, c.created_at, NOW()) / 86400.0, 1) AS age_in_days
      FROM complaints c
      JOIN wards w ON c.ward_id = w.id
      JOIN categories cat ON c.category_id = cat.id
      WHERE c.parent_id IS NULL
    `;

    const params = [];

    if (!officerUser.is_head) {
      query += ' AND c.ward_id = ?';
      params.push(officerUser.ward_id);
    } else if (filters.ward_id) {
      query += ' AND c.ward_id = ?';
      params.push(filters.ward_id);
    }

    if (filters.category_id) {
      query += ' AND c.category_id = ?';
      params.push(filters.category_id);
    }

    if (filters.status) {
      query += ' AND c.status = ?';
      params.push(filters.status);
    }

    if (filters.overdue_only === 'true' || filters.overdue_only === true) {
      query += ' AND c.is_overdue = 1';
    }

    const [rows] = await pool.query(query, params);
    return rows.map((r) => ({
      ...r,
      latitude: parseFloat(r.latitude),
      longitude: parseFloat(r.longitude),
      age_in_days: parseFloat(r.age_in_days)
    }));
  }

  /**
   * Public map markers (sanitized - NO citizen name or contact)
   */
  async getPublicMapMarkers(filters = {}) {
    let query = `
      SELECT c.id, c.ward_id, c.category_id, c.locality,
             c.latitude, c.longitude, c.status, c.is_overdue,
             c.affected_count, c.created_at,
             w.name AS ward_name,
             cat.name AS category_name,
             ROUND(TIMESTAMPDIFF(SECOND, c.created_at, NOW()) / 86400.0, 1) AS age_in_days
      FROM complaints c
      JOIN wards w ON c.ward_id = w.id
      JOIN categories cat ON c.category_id = cat.id
      WHERE c.parent_id IS NULL
    `;

    const params = [];

    if (filters.category_id) {
      query += ' AND c.category_id = ?';
      params.push(filters.category_id);
    }

    if (filters.status) {
      query += ' AND c.status = ?';
      params.push(filters.status);
    }

    if (filters.ward_id) {
      query += ' AND c.ward_id = ?';
      params.push(filters.ward_id);
    }

    const [rows] = await pool.query(query, params);
    return rows.map((r) => ({
      ...r,
      latitude: parseFloat(r.latitude),
      longitude: parseFloat(r.longitude),
      age_in_days: parseFloat(r.age_in_days)
    }));
  }

  /**
   * Officer dashboard KPI summary counts
   */
  async getOfficerStats(officerUser) {
    let baseQuery = `FROM complaints WHERE parent_id IS NULL`;
    const params = [];

    if (!officerUser.is_head) {
      baseQuery += ` AND ward_id = ?`;
      params.push(officerUser.ward_id);
    }

    const [totalRows] = await pool.query(`SELECT COUNT(*) AS count ${baseQuery}`, params);
    const [openRows] = await pool.query(`SELECT COUNT(*) AS count ${baseQuery} AND status = 'Open'`, params);
    const [inProgressRows] = await pool.query(`SELECT COUNT(*) AS count ${baseQuery} AND status = 'In Progress'`, params);
    const [pendingConfRows] = await pool.query(`SELECT COUNT(*) AS count ${baseQuery} AND status = 'Pending Confirmation'`, params);
    const [closedRows] = await pool.query(`SELECT COUNT(*) AS count ${baseQuery} AND status = 'Closed'`, params);
    const [reopenedRows] = await pool.query(`SELECT COUNT(*) AS count ${baseQuery} AND status = 'Reopened'`, params);
    const [overdueRows] = await pool.query(`SELECT COUNT(*) AS count ${baseQuery} AND is_overdue = 1`, params);

    return {
      total: totalRows[0].count,
      open: openRows[0].count,
      in_progress: inProgressRows[0].count,
      pending_confirmation: pendingConfRows[0].count,
      closed: closedRows[0].count,
      reopened: reopenedRows[0].count,
      overdue: overdueRows[0].count
    };
  }
}

module.exports = new ComplaintService();
