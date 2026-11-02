const cron = require('node-cron');
const pool = require('../config/db');
const { getConfig, calculatePriorityScore } = require('../services/ruleEngine');

async function runPeriodicJobs() {
  console.log('[Scheduler] Running periodic SLA, priority & auto-close checks...');

  try {
    const config = await getConfig(pool);
    const autoCloseDays = config.auto_close_days || 7;
    const priorityWAge = config.priority_w_age || 1;
    const priorityWAffected = config.priority_w_affected || 2;

    // 1. Auto-close complaints pending confirmation after auto_close_days
    const [stalePending] = await pool.query(
      `SELECT id, status, resolved_at
       FROM complaints
       WHERE status = 'Pending Confirmation'
         AND resolved_at < NOW() - INTERVAL ? DAY`,
      [autoCloseDays]
    );

    for (const item of stalePending) {
      console.log(`[Scheduler] Auto-closing complaint #${item.id} (unverified after ${autoCloseDays} days)`);
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        await conn.query(
          `UPDATE complaints 
           SET status = 'Closed', 
               closed_unverified = TRUE, 
               closed_at = NOW() 
           WHERE id = ?`,
          [item.id]
        );

        await conn.query(
          `INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, note)
           VALUES (?, 'Pending Confirmation', 'Closed', NULL, ?)`,
          [item.id, `Auto-closed after ${autoCloseDays} days without citizen confirmation`]
        );

        await conn.commit();
      } catch (e) {
        await conn.rollback();
        console.error(`[Scheduler] Failed to auto-close complaint #${item.id}:`, e);
      } finally {
        conn.release();
      }
    }

    // 2. Recompute SLA is_overdue & priority_score for non-closed complaints
    const [activeComplaints] = await pool.query(
      `SELECT c.id, c.created_at, c.affected_count, c.status,
              cat.sla_days, cat.severity_weight,
              TIMESTAMPDIFF(SECOND, c.created_at, NOW()) AS elapsed_seconds
       FROM complaints c
       JOIN categories cat ON c.category_id = cat.id
       WHERE c.status != 'Closed'`
    );

    for (const c of activeComplaints) {
      const slaSeconds = c.sla_days * 86400;
      const isOverdueNow = c.elapsed_seconds > slaSeconds ? 1 : 0;
      const ageDays = Math.max(0, c.elapsed_seconds / 86400.0);

      const newPriority = calculatePriorityScore({
        severityWeight: c.severity_weight,
        ageInDays: ageDays,
        affectedCount: c.affected_count,
        priorityWAge,
        priorityWAffected
      });

      await pool.query(
        'UPDATE complaints SET is_overdue = ?, priority_score = ? WHERE id = ?',
        [isOverdueNow, newPriority, c.id]
      );
    }

    console.log(`[Scheduler] Periodic check finished. Processed ${activeComplaints.length} active complaints.`);
  } catch (err) {
    console.error('[Scheduler] Error running scheduled jobs:', err);
  }
}

function initScheduler() {
  // Run every 15 minutes: '*/15 * * * *'
  cron.schedule('*/15 * * * *', () => {
    runPeriodicJobs();
  });

  console.log('[Scheduler] Cron job initialized (running every 15 minutes).');
}

module.exports = {
  initScheduler,
  runPeriodicJobs
};

