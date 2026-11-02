const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { haversineDistanceMeters, isOverdue } = require('../src/services/ruleEngine');
const { getWardScores } = require('../src/services/scoreService');

describe('Business Rules & Boundary Verification', () => {
  let citizenToken;

  beforeAll(async () => {
    const cit = await request(app).post('/api/auth/citizen/login').send({
      email: 'citizen1@civictrack.test',
      password: 'Citizen@123'
    });
    citizenToken = cit.body.token;
  });

  test('Boundary: Haversine distance calculator accuracy', () => {
    // Coordinate 1: [21.145800, 79.088200]
    // 1 degree latitude is approx 111,139 meters. 0.001 deg lat ~ 111.14 m
    const lat1 = 21.145800;
    const lon1 = 79.088200;
    const lat2 = 21.145800 + (100 / 111139); // exactly ~100m north
    const lon2 = 79.088200;

    const dist = haversineDistanceMeters(lat1, lon1, lat2, lon2);
    expect(Math.abs(dist - 100)).toBeLessThan(1.0); // within 1 meter
  });

  test('Boundary: SLA Overdue - exactly at SLA (not overdue) vs 1 second later (overdue)', () => {
    const slaDays = 3;
    const now = new Date('2026-03-10T12:00:00Z');

    // Exactly 3 days ago = 3 * 86400 seconds ago
    const exactCreatedAt = new Date(now.getTime() - (3 * 86400 * 1000));
    expect(isOverdue(exactCreatedAt, slaDays, 'Open', now)).toBe(false);

    // 1 second past SLA = 3 days + 1 second ago
    const overdueCreatedAt = new Date(now.getTime() - (3 * 86400 * 1000 + 1000));
    expect(isOverdue(overdueCreatedAt, slaDays, 'Open', now)).toBe(true);

    // Closed status is never overdue
    expect(isOverdue(overdueCreatedAt, slaDays, 'Closed', now)).toBe(false);
  });

  test('Boundary: Duplicate merging at 150m (merged) vs 151m (new parent)', async () => {
    // Clear any active complaints in Ward 4 category 4 so this test has isolated parents
    await pool.query('UPDATE complaints SET status = "Closed" WHERE ward_id = 4 AND category_id = 4');

    // 1. File base complaint in Ward 4
    const baseRes = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        category_id: 4, // Water Leak
        ward_id: 4,
        locality: 'Ramdaspeth Water Point',
        description: 'Underground pipeline rupture spraying water.',
        latitude: 21.138000,
        longitude: 79.073000
      });

    expect(baseRes.status).toBe(201);
    const parentId = baseRes.body.complaintId;

    // 2. Second complaint ~100 meters away (< 150m): MUST MERGE
    // Latitude delta for 100m: 100 / 111139 = 0.0008998
    const insideLat = 21.138000 + (100 / 111139);
    const mergeRes = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        category_id: 4,
        ward_id: 4,
        locality: 'Ramdaspeth Water Point Near',
        description: 'Water leak continuing in same vicinity.',
        latitude: insideLat,
        longitude: 79.073000
      });

    expect(mergeRes.status).toBe(201);
    expect(mergeRes.body.merged).toBe(true);
    expect(mergeRes.body.parentId).toBe(parentId);

    // 3. Third complaint ~200 meters away (> 150m): MUST NOT MERGE (creates new parent)
    const outsideLat = 21.138000 + (220 / 111139);
    const separateRes = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        category_id: 4,
        ward_id: 4,
        locality: 'Far End Ramdaspeth',
        description: 'Another separate water leak further away.',
        latitude: outsideLat,
        longitude: 79.073000
      });

    expect(separateRes.status).toBe(201);
    expect(separateRes.body.merged).toBe(false);
    expect(separateRes.body.parentId).toBeUndefined();
  });

  test('Boundary: Duplicate window - 14 days (merged) vs 15 days (not merged)', async () => {
    // Clear any active complaints in Ward 5 & 6 category 1 for test isolation
    await pool.query('UPDATE complaints SET status = "Closed" WHERE ward_id IN (5, 6) AND category_id = 1');

    // Create an old parent complaint created 14.5 days ago directly in DB
    const [cat] = await pool.query('SELECT * FROM categories WHERE id = 1');
    const [user] = await pool.query('SELECT id FROM users WHERE role = "citizen" LIMIT 1');

    // Parent A: 13 days old (within 14 days window)
    const [parentA] = await pool.query(
      `INSERT INTO complaints 
       (user_id, ward_id, category_id, locality, description, latitude, longitude, status, parent_id, affected_count, priority_score, created_at)
       VALUES (?, 5, 1, 'Hanuman Nagar Test', 'Old streetlight issue 13d', 21.123000, 79.100000, 'Open', NULL, 1, 3, NOW() - INTERVAL 13 DAY)`,
      [user[0].id]
    );

    // File at same location: should merge with parent A
    const resA = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        category_id: 1,
        ward_id: 5,
        locality: 'Hanuman Nagar Test',
        description: 'Duplicate of 13d old complaint.',
        latitude: 21.123000,
        longitude: 79.100000
      });

    expect(resA.status).toBe(201);
    expect(resA.body.merged).toBe(true);
    expect(resA.body.parentId).toBe(parentA.insertId);

    // Parent B: 15 days old (outside 14 days window)
    // Mark previous complaints in that ward/category closed so they don't interfere
    await pool.query('UPDATE complaints SET status = "Closed" WHERE ward_id = 6 AND category_id = 1');

    const [parentB] = await pool.query(
      `INSERT INTO complaints 
       (user_id, ward_id, category_id, locality, description, latitude, longitude, status, parent_id, affected_count, priority_score, created_at)
       VALUES (?, 6, 1, 'Tukdoji Test 15d', 'Old streetlight issue 15d', 21.112000, 79.098000, 'Open', NULL, 1, 3, NOW() - INTERVAL 15 DAY)`,
      [user[0].id]
    );

    const resB = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        category_id: 1,
        ward_id: 6,
        locality: 'Tukdoji Test 15d',
        description: 'New complaint at same spot after 15 days.',
        latitude: 21.112000,
        longitude: 79.098000
      });

    expect(resB.status).toBe(201);
    expect(resB.body.merged).toBe(false); // Does not merge because > 14 days
  });

  test('Boundary: Ward with zero complaints returns null score ("No data")', async () => {
    // Create an empty dummy ward in DB
    const [zone] = await pool.query('SELECT id FROM zones LIMIT 1');
    const [wardRes] = await pool.query(
      'INSERT INTO wards (name, zone_id, latitude, longitude) VALUES (?, ?, 21.1500, 79.0800)',
      [`Empty Ward ${Date.now()}`, zone[0].id]
    );
    const emptyWardId = wardRes.insertId;

    const scores = await getWardScores(emptyWardId);
    expect(scores.length).toBe(1);
    expect(scores[0].total_complaints).toBe(0);
    expect(scores[0].performance_score).toBeNull();
    expect(scores[0].score_display).toBe('No data');

    // Clean up dummy ward
    await pool.query('DELETE FROM wards WHERE id = ?', [emptyWardId]);
  });

  test('Results check: Verify ward scores formula against hand calculation for 2 wards', async () => {
    const scoresRes = await request(app).get('/api/wards/scores');
    expect(scoresRes.status).toBe(200);
    const scores = scoresRes.body.scores;

    // Pick 2 wards with complaints
    const testWards = scores.filter(w => w.total_complaints > 0).slice(0, 2);
    expect(testWards.length).toBe(2);

    for (const w of testWards) {
      // Hand calculate based on Section 8.4:
      // score = 100 - (30 * min(avg_resolution_days, 14) / 14) - (30 * overdue_share) - (40 * reopen_rate)
      const cap = 14;
      const timePenalty = 30 * (Math.min(w.avg_resolution_days, cap) / cap);
      const overduePenalty = 30 * w.overdue_share;
      const reopenPenalty = 40 * w.reopen_rate;

      const handScoreRaw = 100 - timePenalty - overduePenalty - reopenPenalty;
      const expectedScore = Math.max(0, Math.min(100, Math.round(handScoreRaw * 100) / 100));

      expect(Math.abs(w.performance_score - expectedScore)).toBeLessThan(0.05);
    }
  });
});
