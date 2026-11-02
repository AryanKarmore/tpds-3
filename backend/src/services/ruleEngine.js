/**
 * Rule Engine for CivicTrack Nagpur
 * Implements business rules for duplicate detection, priority scoring, SLA computation, and status state machine.
 */

// Bounding box for Nagpur municipal jurisdiction
// [[20.95, 78.90], [21.30, 79.30]]
const NAGPUR_BOUNDS = {
  minLat: 20.95,
  maxLat: 21.30,
  minLng: 78.90,
  maxLng: 79.30
};

/**
 * Validates whether coordinates fall inside the Nagpur bounding box
 */
function isInsideNagpur(lat, lng) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) return false;

  return (
    latitude >= NAGPUR_BOUNDS.minLat &&
    latitude <= NAGPUR_BOUNDS.maxLat &&
    longitude >= NAGPUR_BOUNDS.minLng &&
    longitude <= NAGPUR_BOUNDS.maxLng
  );
}

/**
 * Calculate Haversine distance in meters between two coordinates
 */
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of Earth in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fetch key-value system configurations from config table
 */
async function getConfig(dbConn) {
  const [rows] = await dbConn.query('SELECT `key`, `value` FROM config');
  const defaults = {
    duplicate_window_days: 14,
    duplicate_radius_m: 150,
    auto_close_days: 7,
    score_w_time: 30,
    score_w_overdue: 30,
    score_w_reopen: 40,
    score_time_cap_days: 14,
    priority_w_age: 1,
    priority_w_affected: 2
  };

  rows.forEach((row) => {
    defaults[row.key] = parseFloat(row.value);
  });

  return defaults;
}

/**
 * Priority score calculation
 * priority_score = (category.severity_weight) + (age_in_days * priority_w_age) + (affected_count * priority_w_affected)
 */
function calculatePriorityScore({ severityWeight, ageInDays, affectedCount, priorityWAge = 1, priorityWAffected = 2 }) {
  const weight = parseFloat(severityWeight) || 0;
  const age = Math.max(0, parseFloat(ageInDays) || 0);
  const affected = Math.max(1, parseInt(affectedCount, 10) || 1);

  const score = weight + (age * priorityWAge) + (affected * priorityWAffected);
  return Math.round(score * 100) / 100;
}

/**
 * Check if a complaint is overdue based on category SLA in days
 * Boundary condition:
 * At exactly the SLA duration: NOT overdue.
 * One second later: OVERDUE.
 * (reopened complaints count from original created_at)
 */
function isOverdue(createdAt, slaDays, status, currentTime = new Date()) {
  if (status === 'Closed') {
    return false;
  }

  const createdTimeMs = new Date(createdAt).getTime();
  const currentMs = new Date(currentTime).getTime();
  const slaSeconds = slaDays * 86400;
  const elapsedSeconds = (currentMs - createdTimeMs) / 1000;

  return elapsedSeconds > slaSeconds;
}

/**
 * Allowed status transitions state machine
 *
 * | From | To | Who |
 * |---|---|---|
 * | Open | In Progress | officer |
 * | In Progress | Pending Confirmation (Mark Resolved) | officer |
 * | Pending Confirmation | Closed | citizen (confirm) or system (auto-close) |
 * | Pending Confirmation | Reopened | citizen (reject) |
 * | Reopened | In Progress | officer |
 */
const ALLOWED_TRANSITIONS = [
  { from: 'Open', to: 'In Progress', allowedRoles: ['officer'] },
  { from: 'In Progress', to: 'Pending Confirmation', allowedRoles: ['officer'] },
  { from: 'Pending Confirmation', to: 'Closed', allowedRoles: ['citizen', 'system'] },
  { from: 'Pending Confirmation', to: 'Reopened', allowedRoles: ['citizen'] },
  { from: 'Reopened', to: 'In Progress', allowedRoles: ['officer'] }
];

function canTransition(currentStatus, nextStatus, role) {
  const match = ALLOWED_TRANSITIONS.find(
    (t) => t.from === currentStatus && t.to === nextStatus
  );

  if (!match) {
    return {
      allowed: false,
      reason: `Invalid status transition from '${currentStatus}' to '${nextStatus}'.`
    };
  }

  if (!match.allowedRoles.includes(role)) {
    return {
      allowed: false,
      reason: `Role '${role}' is not authorized to transition status from '${currentStatus}' to '${nextStatus}'.`
    };
  }

  return { allowed: true };
}

module.exports = {
  NAGPUR_BOUNDS,
  isInsideNagpur,
  haversineDistanceMeters,
  getConfig,
  calculatePriorityScore,
  isOverdue,
  canTransition,
  ALLOWED_TRANSITIONS
};

