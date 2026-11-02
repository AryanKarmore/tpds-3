const bcrypt = require('bcrypt');
const pool = require('../src/config/db');

// Bounding box for Nagpur check
// [[20.95, 78.90], [21.30, 79.30]]

const zonesData = [
  'Laxmi Nagar',
  'Dharampeth',
  'Hanuman Nagar',
  'Dhantoli',
  'Nehru Nagar',
  'Gandhibagh',
  'Satranjipura',
  'Lakadganj',
  'Ashi Nagar',
  'Mangalwari'
];

const wardsData = [
  // Zone 1: Laxmi Nagar
  { name: 'Ward 1 - Pratap Nagar', zone: 'Laxmi Nagar', lat: 21.118000, lng: 79.055000 },
  { name: 'Ward 2 - Bajaj Nagar', zone: 'Laxmi Nagar', lat: 21.127000, lng: 79.065000 },
  // Zone 2: Dharampeth
  { name: 'Ward 3 - Gokulpeth', zone: 'Dharampeth', lat: 21.144000, lng: 79.058000 },
  { name: 'Ward 4 - Ramdaspeth', zone: 'Dharampeth', lat: 21.138000, lng: 79.073000 },
  // Zone 3: Hanuman Nagar
  { name: 'Ward 5 - Hanuman Nagar', zone: 'Hanuman Nagar', lat: 21.123000, lng: 79.100000 },
  { name: 'Ward 6 - Tukdoji Nagar', zone: 'Hanuman Nagar', lat: 21.112000, lng: 79.098000 },
  // Zone 4: Dhantoli
  { name: 'Ward 7 - Dhantoli', zone: 'Dhantoli', lat: 21.135000, lng: 79.082000 },
  { name: 'Ward 8 - Congress Nagar', zone: 'Dhantoli', lat: 21.130000, lng: 79.086000 },
  // Zone 5: Nehru Nagar
  { name: 'Ward 9 - Nehru Nagar', zone: 'Nehru Nagar', lat: 21.125000, lng: 79.120000 },
  { name: 'Ward 10 - Sakkardara', zone: 'Nehru Nagar', lat: 21.117000, lng: 79.115000 },
  // Zone 6: Gandhibagh
  { name: 'Ward 11 - Gandhibagh', zone: 'Gandhibagh', lat: 21.152000, lng: 79.102000 },
  { name: 'Ward 12 - Mahal', zone: 'Gandhibagh', lat: 21.145000, lng: 79.108000 },
  // Zone 7: Satranjipura
  { name: 'Ward 13 - Satranjipura', zone: 'Satranjipura', lat: 21.165000, lng: 79.112000 },
  { name: 'Ward 14 - Itwari', zone: 'Satranjipura', lat: 21.157000, lng: 79.116000 },
  // Zone 8: Lakadganj
  { name: 'Ward 15 - Lakadganj', zone: 'Lakadganj', lat: 21.150000, lng: 79.130000 },
  { name: 'Ward 16 - Pardi', zone: 'Lakadganj', lat: 21.146000, lng: 79.155000 },
  // Zone 9: Ashi Nagar
  { name: 'Ward 17 - Ashi Nagar', zone: 'Ashi Nagar', lat: 21.185000, lng: 79.115000 },
  { name: 'Ward 18 - Indora', zone: 'Ashi Nagar', lat: 21.173000, lng: 79.098000 },
  // Zone 10: Mangalwari
  { name: 'Ward 19 - Sadar', zone: 'Mangalwari', lat: 21.162000, lng: 79.080000 },
  { name: 'Ward 20 - Mankapur', zone: 'Mangalwari', lat: 21.188000, lng: 79.075000 }
];

const categoriesData = [
  { name: 'Streetlight', sla_days: 3, severity_weight: 3 },
  { name: 'Garbage Pickup', sla_days: 2, severity_weight: 4 },
  { name: 'Pothole', sla_days: 7, severity_weight: 5 },
  { name: 'Water Leak', sla_days: 2, severity_weight: 8 }
];

const configData = [
  { key: 'duplicate_window_days', value: '14' },
  { key: 'duplicate_radius_m', value: '150' },
  { key: 'auto_close_days', value: '7' },
  { key: 'score_w_time', value: '30' },
  { key: 'score_w_overdue', value: '30' },
  { key: 'score_w_reopen', value: '40' },
  { key: 'score_time_cap_days', value: '14' },
  { key: 'priority_w_age', value: '1' },
  { key: 'priority_w_affected', value: '2' }
];

// Locality templates by category
const localityTemplates = {
  'Streetlight': ['Main Road Corner', 'Near Community Hall', 'Bus Stop Junction', 'Lane 4 Cross', 'Park Perimeter', 'Market Entrance'],
  'Garbage Pickup': ['Subhash Chowk Dump Point', 'Behind Veg Market', 'Sector 2 Corner', 'Near Public School', 'Commercial Complex Gate'],
  'Pothole': ['Railway Crossing Approach', 'Ring Road Overbridge', 'Main Market Avenue', 'Opposite Metro Pillar', 'Hospital Road Stretch'],
  'Water Leak': ['Pipeline Junction Near Tank', 'Water Valve Box Point', 'Crossroad Pipeline Burst', 'Near Over-Head Reservoir', 'Drainage Line Margin']
};

const descriptionTemplates = {
  'Streetlight': [
    'The streetlight has been flickering and completely turned off for three nights, causing safety concerns.',
    'Street pole wiring exposed and lamp bulb shattered near the residential lane.',
    'Dark stretch on the main street due to non-functioning sodium vapor lamp.',
    'Entire street light line off since yesterday evening storm.'
  ],
  'Garbage Pickup': [
    'Uncollected municipal garbage piling up near the community bins causing unbearable foul smell.',
    'Overflowing waste bin attracting stray dogs and cattle across the pavement.',
    'Green waste and plastic trash dumped openly on the curb and not cleared for days.',
    'Commercial waste dumped on the roadside obstructing pedestrian walking.'
  ],
  'Pothole': [
    'Deep crater formed right in the middle of the roadway causing two-wheeler accidents.',
    'Multiple potholes after recent monsoon rain posing hazard to school buses and traffic.',
    'Sunken asphalt patch creating heavy waterlogging and vehicle underbody damage.',
    'Large trench dug for cable laying left unpaved and causing dangerous traffic jam.'
  ],
  'Water Leak': [
    'Drinking water pipeline burst creating heavy wastage and pressure drop in surrounding houses.',
    'Clean potable water gushing from underground line near the main crossroad valve.',
    'Continuous water pipe leakage softening road surface and creating muddy slush.',
    'Underground distribution pipe rupture flooding the pathway for two consecutive days.'
  ]
};

async function seed(options = {}) {
  const isReset = options.reset || process.argv.includes('--reset');

  console.log(`Starting CivicTrack Nagpur DB seed (Reset: ${isReset})...`);

  // Check if already seeded and not resetting
  const [existingWards] = await pool.query('SELECT COUNT(*) as count FROM wards');
  if (existingWards[0].count > 0 && !isReset) {
    console.log('Database already contains data. Use --reset to re-seed.');
    return;
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    if (isReset) {
      console.log('Clearing existing records...');
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query('TRUNCATE TABLE status_history');
      await conn.query('TRUNCATE TABLE complaints');
      await conn.query('TRUNCATE TABLE users');
      await conn.query('TRUNCATE TABLE wards');
      await conn.query('TRUNCATE TABLE zones');
      await conn.query('TRUNCATE TABLE categories');
      await conn.query('TRUNCATE TABLE config');
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    // 1. Seed Config
    console.log('Seeding config...');
    for (const item of configData) {
      await conn.query(
        'INSERT INTO config (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
        [item.key, item.value]
      );
    }

    // 2. Seed Categories
    console.log('Seeding categories...');
    const categoryMap = {};
    for (const cat of categoriesData) {
      const [res] = await conn.query(
        'INSERT INTO categories (name, sla_days, severity_weight) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE sla_days=VALUES(sla_days), severity_weight=VALUES(severity_weight)',
        [cat.name, cat.sla_days, cat.severity_weight]
      );
      const [row] = await conn.query('SELECT * FROM categories WHERE name = ?', [cat.name]);
      categoryMap[cat.name] = row[0];
    }

    // 3. Seed Zones
    console.log('Seeding zones...');
    const zoneMap = {};
    for (const zoneName of zonesData) {
      await conn.query(
        'INSERT INTO zones (name) VALUES (?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
        [zoneName]
      );
      const [row] = await conn.query('SELECT id FROM zones WHERE name = ?', [zoneName]);
      zoneMap[zoneName] = row[0].id;
    }

    // 4. Seed Wards
    console.log('Seeding wards...');
    const wardMap = {};
    for (const ward of wardsData) {
      const zoneId = zoneMap[ward.zone];
      await conn.query(
        'INSERT INTO wards (name, zone_id, latitude, longitude) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE latitude=VALUES(latitude), longitude=VALUES(longitude)',
        [ward.name, zoneId, ward.lat, ward.lng]
      );
      const [row] = await conn.query('SELECT * FROM wards WHERE name = ?', [ward.name]);
      wardMap[ward.name] = row[0];
    }

    // 5. Seed Users
    console.log('Seeding users (hashing passwords with bcrypt)...');
    const officerHash = await bcrypt.hash('Officer@123', 10);
    const citizenHash = await bcrypt.hash('Citizen@123', 10);

    // 5a. Head Officer
    await conn.query(
      `INSERT INTO users (name, email, phone, password_hash, role, ward_id, is_head)
       VALUES (?, ?, ?, ?, 'officer', NULL, TRUE)
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      ['Nagpur Head Officer', 'head.officer@civictrack.test', '9820000000', officerHash]
    );

    // 5b. 1 Officer per Ward (20 officers)
    const officerIds = [];
    const wardsList = Object.values(wardMap);
    for (let i = 0; i < wardsList.length; i++) {
      const ward = wardsList[i];
      const officerEmail = `officer${i + 1}@civictrack.test`;
      await conn.query(
        `INSERT INTO users (name, email, phone, password_hash, role, ward_id, is_head)
         VALUES (?, ?, ?, ?, 'officer', ?, FALSE)
         ON DUPLICATE KEY UPDATE ward_id=VALUES(ward_id)`,
        [`Officer ${ward.name.split(' - ')[1]}`, officerEmail, `98210000${String(i + 1).padStart(2, '0')}`, officerHash, ward.id]
      );
      const [row] = await conn.query('SELECT id, ward_id FROM users WHERE email = ?', [officerEmail]);
      officerIds.push(row[0]);
    }

    // 5c. 40 Citizens
    const citizenIds = [];
    for (let i = 1; i <= 40; i++) {
      const citizenEmail = `citizen${i}@civictrack.test`;
      await conn.query(
        `INSERT INTO users (name, email, phone, password_hash, role, ward_id, is_head)
         VALUES (?, ?, ?, ?, 'citizen', NULL, FALSE)
         ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [`Citizen Resident ${i}`, citizenEmail, `98300000${String(i).padStart(2, '0')}`, citizenHash]
      );
      const [row] = await conn.query('SELECT id FROM users WHERE email = ?', [citizenEmail]);
      citizenIds.push(row[0].id);
    }

    // 6. Seed Synthetic Complaints (~250 complaints)
    console.log('Seeding 250 synthetic complaints across 4 months...');
    const now = new Date();
    const categoriesList = Object.values(categoryMap);

    // To create realistic variance, define performance profiles for wards
    // Good wards (e.g. ward 1, 3, 7): fast resolution, low overdue, low reopen
    // Poor wards (e.g. ward 10, 15, 18): slow resolution, high overdue, high reopen
    // Average wards: moderate
    const complaintsToInsert = [];
    const statusHistoryToInsert = [];

    // Helper random jitter for coordinates (~ within 100-300m)
    // 0.001 deg lat is ~111m, 0.001 deg lng is ~103m
    function randomOffset() {
      return (Math.random() - 0.5) * 0.004; // roughly within ~200-250m
    }

    let complaintCounter = 0;
    const parentComplaints = []; // For potential duplicates

    for (let wIdx = 0; wIdx < wardsList.length; wIdx++) {
      const ward = wardsList[wIdx];
      const isGoodWard = [1, 3, 7, 12].includes(wIdx + 1);
      const isPoorWard = [10, 15, 18].includes(wIdx + 1);

      // Number of complaints for this ward (around 10 to 16)
      const countForWard = 11 + (wIdx % 5);

      for (let k = 0; k < countForWard; k++) {
        complaintCounter++;
        const cat = categoriesList[(k + wIdx) % categoriesList.length];
        const citizenId = citizenIds[(wIdx * 2 + k) % citizenIds.length];
        const officerForWard = officerIds.find(o => o.ward_id === ward.id) || officerIds[0];

        // Pick date within the last 120 days (4 months)
        const daysAgo = Math.floor(Math.random() * 115) + 1; // 1 to 115 days ago
        const createdAt = new Date(now.getTime() - daysAgo * 24 * 3600 * 1000 - Math.floor(Math.random() * 40000) * 1000);

        // Status determination based on age & ward quality
        let status;
        let reopenCount = 0;
        let resolvedAt = null;
        let closedAt = null;
        let isOverdue = false;
        let closedUnverified = false;

        const slaDurationMs = cat.sla_days * 24 * 3600 * 1000;
        const ageMs = now.getTime() - createdAt.getTime();

        if (isGoodWard) {
          // Mostly Closed or Resolved quickly
          if (daysAgo > cat.sla_days + 3) {
            status = Math.random() < 0.85 ? 'Closed' : 'Pending Confirmation';
          } else {
            status = Math.random() < 0.4 ? 'In Progress' : 'Pending Confirmation';
          }
        } else if (isPoorWard) {
          // Many Overdue, Reopened, Open
          if (daysAgo > cat.sla_days) {
            const roll = Math.random();
            if (roll < 0.45) status = 'Open';
            else if (roll < 0.70) status = 'In Progress';
            else if (roll < 0.85) status = 'Reopened';
            else status = 'Closed';
          } else {
            status = Math.random() < 0.5 ? 'Open' : 'In Progress';
          }
        } else {
          // Normal distribution
          if (daysAgo > cat.sla_days + 7) {
            status = Math.random() < 0.7 ? 'Closed' : (Math.random() < 0.5 ? 'In Progress' : 'Open');
          } else if (daysAgo > cat.sla_days) {
            status = Math.random() < 0.5 ? 'In Progress' : 'Pending Confirmation';
          } else {
            status = Math.random() < 0.4 ? 'Open' : 'In Progress';
          }
        }

        // Set dates and flags according to status
        if (status === 'Closed') {
          const resolutionHours = isGoodWard ? (cat.sla_days * 12 + Math.random() * 24) : (cat.sla_days * 36 + Math.random() * 96);
          resolvedAt = new Date(createdAt.getTime() + resolutionHours * 3600 * 1000);
          if (resolvedAt > now) resolvedAt = new Date(now.getTime() - 12 * 3600 * 1000);
          
          closedAt = new Date(resolvedAt.getTime() + (Math.random() * 48 + 4) * 3600 * 1000);
          if (closedAt > now) closedAt = new Date(now.getTime() - 2 * 3600 * 1000);

          if (isPoorWard && Math.random() < 0.35) {
            reopenCount = 1;
          }
          isOverdue = (resolvedAt.getTime() - createdAt.getTime()) > slaDurationMs;
        } else if (status === 'Pending Confirmation') {
          const resolutionHours = isGoodWard ? (cat.sla_days * 16) : (cat.sla_days * 40);
          resolvedAt = new Date(createdAt.getTime() + resolutionHours * 3600 * 1000);
          if (resolvedAt > now) resolvedAt = new Date(now.getTime() - 6 * 3600 * 1000);
          isOverdue = ageMs > slaDurationMs;
          if (isPoorWard && Math.random() < 0.3) {
            reopenCount = 1;
          }
        } else if (status === 'Reopened') {
          reopenCount = isPoorWard ? 2 : 1;
          const firstResolve = new Date(createdAt.getTime() + cat.sla_days * 20 * 3600 * 1000);
          resolvedAt = firstResolve < now ? firstResolve : new Date(now.getTime() - 24 * 3600 * 1000);
          isOverdue = ageMs > slaDurationMs;
        } else {
          // Open or In Progress
          isOverdue = ageMs > slaDurationMs;
        }

        const ageDays = Math.max(0, Math.floor(ageMs / (24 * 3600 * 1000)));
        const affectedCount = 1;
        const priorityScore = cat.severity_weight + (ageDays * 1) + (affectedCount * 2);

        const wardLat = parseFloat(ward.latitude);
        const wardLng = parseFloat(ward.longitude);
        const lat = parseFloat((wardLat + randomOffset()).toFixed(6));
        const lng = parseFloat((wardLng + randomOffset()).toFixed(6));

        const localities = localityTemplates[cat.name];
        const locality = `${localities[k % localities.length]}, ${ward.name.split(' - ')[1]}`;
        const descriptions = descriptionTemplates[cat.name];
        const description = descriptions[k % descriptions.length];

        complaintsToInsert.push({
          user_id: citizenId,
          ward_id: ward.id,
          category_id: cat.id,
          locality,
          description,
          latitude: lat,
          longitude: lng,
          status,
          parent_id: null,
          affected_count: affectedCount,
          priority_score: priorityScore,
          is_overdue: isOverdue ? 1 : 0,
          reopen_count: reopenCount,
          closed_unverified: closedUnverified ? 1 : 0,
          created_at: createdAt,
          resolved_at: resolvedAt,
          closed_at: closedAt,
          officer_id: officerForWard.id
        });
      }
    }

    console.log(`Inserting ${complaintsToInsert.length} parent complaints...`);
    const insertedParentIds = [];

    for (const c of complaintsToInsert) {
      const [res] = await conn.query(
        `INSERT INTO complaints 
         (user_id, ward_id, category_id, locality, description, latitude, longitude, status, parent_id, affected_count, priority_score, is_overdue, reopen_count, closed_unverified, created_at, resolved_at, closed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.user_id, c.ward_id, c.category_id, c.locality, c.description,
          c.latitude, c.longitude, c.status, c.parent_id, c.affected_count,
          c.priority_score, c.is_overdue, c.reopen_count, c.closed_unverified,
          c.created_at, c.resolved_at, c.closed_at
        ]
      );
      const insertedId = res.insertId;
      insertedParentIds.push({ id: insertedId, ...c });

      // Build status_history
      // Initial creation
      await conn.query(
        `INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, note, changed_at)
         VALUES (?, NULL, 'Open', ?, 'Complaint submitted by citizen', ?)`,
        [insertedId, c.user_id, c.created_at]
      );

      if (['In Progress', 'Pending Confirmation', 'Reopened', 'Closed'].includes(c.status)) {
        const inProgressTime = new Date(c.created_at.getTime() + 4 * 3600 * 1000);
        await conn.query(
          `INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, note, changed_at)
           VALUES (?, 'Open', 'In Progress', ?, 'Ward crew assigned to inspect site', ?)`,
          [insertedId, c.officer_id, inProgressTime]
        );
      }

      if (['Pending Confirmation', 'Reopened', 'Closed'].includes(c.status) && c.resolved_at) {
        await conn.query(
          `INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, note, changed_at)
           VALUES (?, 'In Progress', 'Pending Confirmation', ?, 'Field repair completed; awaiting citizen confirmation', ?)`,
          [insertedId, c.officer_id, c.resolved_at]
        );
      }

      if (c.reopen_count > 0) {
        const reopenTime = new Date((c.resolved_at || c.created_at).getTime() + 12 * 3600 * 1000);
        await conn.query(
          `INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, note, changed_at)
           VALUES (?, 'Pending Confirmation', 'Reopened', ?, 'Citizen rejected: Work done is substandard and area is still affected.', ?)`,
          [insertedId, c.user_id, reopenTime]
        );

        if (c.status === 'Closed') {
          // Re-repaired and closed
          await conn.query(
            `INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, note, changed_at)
             VALUES (?, 'Reopened', 'In Progress', ?, 'Re-inspection initiated', ?)`,
            [insertedId, c.officer_id, new Date(reopenTime.getTime() + 6 * 3600 * 1000)]
          );
          await conn.query(
            `INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, note, changed_at)
             VALUES (?, 'In Progress', 'Pending Confirmation', ?, 'Second repair completed', ?)`,
            [insertedId, c.officer_id, new Date(reopenTime.getTime() + 24 * 3600 * 1000)]
          );
          await conn.query(
            `INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, note, changed_at)
             VALUES (?, 'Pending Confirmation', 'Closed', ?, 'Citizen verified and accepted resolution.', ?)`,
            [insertedId, c.user_id, c.closed_at]
          );
        }
      } else if (c.status === 'Closed' && c.closed_at) {
        await conn.query(
          `INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, note, changed_at)
           VALUES (?, 'Pending Confirmation', 'Closed', ?, 'Citizen confirmed resolution in citizen portal.', ?)`,
          [insertedId, c.user_id, c.closed_at]
        );
      }
    }

    // 7. Seed Duplicates / Merged complaints (~12 duplicates to test merging and affected counts)
    console.log('Seeding merged duplicate complaints...');
    const duplicateCandidates = insertedParentIds.filter(p => p.status !== 'Closed').slice(0, 12);
    for (const parent of duplicateCandidates) {
      // Pick a different citizen
      const childCitizenId = citizenIds[(parent.user_id + 5) % citizenIds.length];
      const childCreated = new Date(parent.created_at.getTime() + (Math.random() * 5 + 1) * 24 * 3600 * 1000);
      // Very close location (< 80 meters)
      const childLat = parseFloat((parent.latitude + 0.0003).toFixed(6));
      const childLng = parseFloat((parent.longitude + 0.0003).toFixed(6));

      const [childRes] = await conn.query(
        `INSERT INTO complaints 
         (user_id, ward_id, category_id, locality, description, latitude, longitude, status, parent_id, affected_count, priority_score, is_overdue, reopen_count, closed_unverified, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?, 1, 0, 0, 0, 0, ?)`,
        [
          childCitizenId, parent.ward_id, parent.category_id, parent.locality,
          `Second report on same issue: ${parent.description}`,
          childLat, childLng, parent.id, childCreated
        ]
      );

      // Increment parent affected_count and update priority
      await conn.query(
        `UPDATE complaints 
         SET affected_count = affected_count + 1,
             priority_score = priority_score + 2
         WHERE id = ?`,
        [parent.id]
      );

      await conn.query(
        `INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, note, changed_at)
         VALUES (?, NULL, 'Open', ?, 'Merged as duplicate of complaint #${parent.id}', ?)`,
        [childRes.insertId, childCitizenId, childCreated]
      );
    }

    await conn.commit();
    console.log('Seed completed successfully!');
    console.log('--------------------------------------------------');
    console.log('Default Seed Logins:');
    console.log('Head Officer:');
    console.log('  Email: head.officer@civictrack.test  | Password: Officer@123');
    console.log('Ward Officers (Wards 1-20):');
    console.log('  Email: officer1@civictrack.test      | Password: Officer@123');
    console.log('  Email: officer2@civictrack.test      | Password: Officer@123');
    console.log('  ... up to officer20@civictrack.test');
    console.log('Citizens:');
    console.log('  Email: citizen1@civictrack.test      | Password: Citizen@123');
    console.log('  Email: citizen2@civictrack.test      | Password: Citizen@123');
    console.log('  ... up to citizen40@civictrack.test');
    console.log('--------------------------------------------------');
    console.log('Note: All complaints and users are SYNTHETIC test data.');
  } catch (err) {
    await conn.rollback();
    console.error('Seed failed:', err);
    throw err;
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seed;
