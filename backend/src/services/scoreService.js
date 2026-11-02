const pool = require('../config/db');
const { getConfig } = require('./ruleEngine');

/**
 * Calculates ward performance scores for all wards or a single ward.
 */
async function getWardScores(wardId = null) {
  const config = await getConfig(pool);

  let query = `
    SELECT
      w.id AS ward_id,
      w.name AS ward_name,
      z.id AS zone_id,
      z.name AS zone_name,
      w.latitude,
      w.longitude,
      COUNT(c.id) AS total_complaints,
      SUM(CASE WHEN c.status IN ('Open', 'In Progress', 'Reopened') THEN 1 ELSE 0 END) AS open_complaints,
      SUM(CASE WHEN c.status IN ('Pending Confirmation', 'Closed') THEN 1 ELSE 0 END) AS resolved_complaints,
      SUM(CASE WHEN c.is_overdue = 1 THEN 1 ELSE 0 END) AS overdue_count,
      ROUND(
        CASE 
          WHEN COUNT(c.id) > 0 THEN SUM(CASE WHEN c.is_overdue = 1 THEN 1 ELSE 0 END) / COUNT(c.id)
          ELSE 0 
        END, 
        4
      ) AS overdue_share,
      ROUND(
        COALESCE(
          AVG(CASE WHEN c.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, c.created_at, c.resolved_at) / 86400.0 END),
          0
        ),
        2
      ) AS avg_resolution_days,
      SUM(CASE WHEN c.reopen_count > 0 THEN 1 ELSE 0 END) AS reopened_complaints,
      ROUND(
        CASE 
          WHEN SUM(CASE WHEN c.resolved_at IS NOT NULL THEN 1 ELSE 0 END) > 0 
          THEN SUM(CASE WHEN c.reopen_count > 0 THEN 1 ELSE 0 END) / SUM(CASE WHEN c.resolved_at IS NOT NULL THEN 1 ELSE 0 END)
          ELSE 0 
        END,
        4
      ) AS reopen_rate
    FROM wards w
    JOIN zones z ON w.zone_id = z.id
    LEFT JOIN complaints c ON w.id = c.ward_id AND c.parent_id IS NULL
  `;

  const params = [];
  if (wardId) {
    query += ' WHERE w.id = ?';
    params.push(wardId);
  }

  query += ' GROUP BY w.id, w.name, z.id, z.name, w.latitude, w.longitude ORDER BY w.id ASC';

  const [rows] = await pool.query(query, params);

  return rows.map((row) => {
    const total = parseInt(row.total_complaints, 10);
    const avgResDays = parseFloat(row.avg_resolution_days) || 0;
    const overdueShare = parseFloat(row.overdue_share) || 0;
    const reopenRate = parseFloat(row.reopen_rate) || 0;

    let score = null;

    if (total > 0) {
      const cap = config.score_time_cap_days || 14;
      const wTime = config.score_w_time || 30;
      const wOverdue = config.score_w_overdue || 30;
      const wReopen = config.score_w_reopen || 40;

      const timePenalty = wTime * (Math.min(avgResDays, cap) / cap);
      const overduePenalty = wOverdue * overdueShare;
      const reopenPenalty = wReopen * reopenRate;

      const rawScore = 100 - timePenalty - overduePenalty - reopenPenalty;
      score = Math.max(0, Math.min(100, Math.round(rawScore * 100) / 100));
    }

    return {
      ward_id: row.ward_id,
      ward_name: row.ward_name,
      zone_id: row.zone_id,
      zone_name: row.zone_name,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      total_complaints: total,
      open_complaints: parseInt(row.open_complaints, 10),
      resolved_complaints: parseInt(row.resolved_complaints, 10),
      overdue_count: parseInt(row.overdue_count, 10),
      overdue_share: overdueShare,
      avg_resolution_days: avgResDays,
      reopened_complaints: parseInt(row.reopened_complaints, 10),
      reopen_rate: reopenRate,
      performance_score: score, // null when total === 0
      score_display: score !== null ? `${score.toFixed(1)} / 100` : 'No data'
    };
  });
}

module.exports = {
  getWardScores
};

