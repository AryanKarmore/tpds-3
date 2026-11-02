const request = require('supertest');
const sharp = require('sharp');
const app = require('../src/app');
const pool = require('../src/config/db');

describe('Complaints Workflow & Enforcement', () => {
  let citizenToken;
  let otherCitizenToken;
  let officerWard1Token;
  let officerWard2Token;
  let citizenId;
  let otherCitizenId;
  let dummyAfterPhoto;

  beforeAll(async () => {
    dummyAfterPhoto = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 50, g: 150, b: 250 } }
    }).jpeg().toBuffer();

    // Citizen 1
    const cit1 = await request(app).post('/api/auth/citizen/login').send({
      email: 'citizen1@civictrack.test',
      password: 'Citizen@123'
    });
    citizenToken = cit1.body.token;
    citizenId = cit1.body.user.id;

    // Citizen 2
    const cit2 = await request(app).post('/api/auth/citizen/login').send({
      email: 'citizen2@civictrack.test',
      password: 'Citizen@123'
    });
    otherCitizenToken = cit2.body.token;
    otherCitizenId = cit2.body.user.id;

    // Officer Ward 1
    const off1 = await request(app).post('/api/auth/officer/login').send({
      email: 'officer1@civictrack.test',
      password: 'Officer@123'
    });
    officerWard1Token = off1.body.token;

    // Officer Ward 2
    const off2 = await request(app).post('/api/auth/officer/login').send({
      email: 'officer2@civictrack.test',
      password: 'Officer@123'
    });
    officerWard2Token = off2.body.token;
  });

  test('Location outside Nagpur bounding box rejected (400)', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        category_id: 1,
        ward_id: 1,
        locality: 'Mumbai Highway',
        description: 'Pothole located outside Nagpur municipal area',
        latitude: 19.0760, // Mumbai latitude
        longitude: 72.8777
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  test('Boundary: Description length 9 chars (invalid)', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        category_id: 1,
        ward_id: 1,
        locality: 'Pratap Nagar',
        description: '123456789', // 9 characters
        latitude: 21.1180,
        longitude: 79.0550
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  test('Boundary: Description length 10 chars (valid)', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        category_id: 1,
        ward_id: 1,
        locality: 'Pratap Nagar',
        description: '1234567890', // exactly 10 characters
        latitude: 21.1180,
        longitude: 79.0550
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('complaintId');
  });

  test('Boundary: Description length 501 chars (invalid)', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        category_id: 1,
        ward_id: 1,
        locality: 'Pratap Nagar',
        description: 'a'.repeat(501),
        latitude: 21.1180,
        longitude: 79.0550
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  test('Citizen calling officer queue endpoint is rejected (403)', async () => {
    const res = await request(app)
      .get('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(403);
  });

  test('Full lifecycle: File -> In Progress -> Resolved -> Citizen Confirm -> Closed', async () => {
    // 1. Citizen files complaint in Ward 1
    const fileRes = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        category_id: 3, // Pothole
        ward_id: 1,
        locality: 'Main Chowk Road',
        description: 'Deep road depression near market square.',
        latitude: 21.1185,
        longitude: 79.0555
      });

    expect(fileRes.status).toBe(201);
    const complaintId = fileRes.body.complaintId;

    // 2. Officer Ward 1 moves to In Progress
    const inProgressRes = await request(app)
      .patch(`/api/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${officerWard1Token}`)
      .send({
        status: 'In Progress',
        note: 'Assigned maintenance team'
      });

    expect(inProgressRes.status).toBe(200);
    expect(inProgressRes.body.status).toBe('In Progress');

    // 3. Officer Ward 1 moves to Pending Confirmation (Mark Resolved with required after-photo)
    const resolveRes = await request(app)
      .patch(`/api/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${officerWard1Token}`)
      .field('status', 'Pending Confirmation')
      .field('note', 'Bitumen patch work finished')
      .attach('photo', dummyAfterPhoto, 'after_patch.jpg');

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.status).toBe('Pending Confirmation');

    // 4. Non-owner citizen attempting to confirm is rejected (403)
    const unauthorizedConfirm = await request(app)
      .post(`/api/complaints/${complaintId}/confirm`)
      .set('Authorization', `Bearer ${otherCitizenToken}`);

    expect(unauthorizedConfirm.status).toBe(403);

    // 5. Original citizen confirms resolution -> Closed
    const confirmRes = await request(app)
      .post(`/api/complaints/${complaintId}/confirm`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.status).toBe('Closed');

    // Verify detail shows Closed and full timeline
    const detailRes = await request(app)
      .get(`/api/complaints/${complaintId}`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.complaint.status).toBe('Closed');
    expect(detailRes.body.complaint.history.length).toBeGreaterThanOrEqual(4);
  });

  test('Rejection workflow: Pending Confirmation -> Citizen Reject -> Reopened', async () => {
    // 1. Citizen files complaint in Ward 1
    const fileRes = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        category_id: 2, // Garbage
        ward_id: 1,
        locality: 'Sector 4 Corner',
        description: 'Large garbage pile left uncleaned.',
        latitude: 21.1190,
        longitude: 79.0560
      });

    const complaintId = fileRes.body.complaintId;

    // Move Open -> In Progress -> Pending Confirmation
    await request(app)
      .patch(`/api/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${officerWard1Token}`)
      .send({ status: 'In Progress' });

    await request(app)
      .patch(`/api/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${officerWard1Token}`)
      .field('status', 'Pending Confirmation')
      .attach('photo', dummyAfterPhoto, 'resolved.jpg');

    // Boundary: Reject with reason < 10 chars (invalid)
    const shortReject = await request(app)
      .post(`/api/complaints/${complaintId}/reject`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ reason: 'Not done' }); // 8 chars

    expect(shortReject.status).toBe(400);

    // Valid Reject with reason >= 10 chars
    const validReject = await request(app)
      .post(`/api/complaints/${complaintId}/reject`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ reason: 'Garbage was only half cleared; residue still stinking.' });

    expect(validReject.status).toBe(200);
    expect(validReject.body.status).toBe('Reopened');
    expect(validReject.body.reopen_count).toBe(1);
  });

  test('Invalid transition rejected with 409 Conflict', async () => {
    // File new complaint (starts Open)
    const fileRes = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        category_id: 1,
        ward_id: 1,
        locality: 'Park Perimeter',
        description: 'Broken lamp fixture sparking.',
        latitude: 21.1192,
        longitude: 79.0565
      });

    const complaintId = fileRes.body.complaintId;

    // Try to jump directly from Open to Closed (not allowed)
    const invalidRes = await request(app)
      .patch(`/api/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${officerWard1Token}`)
      .send({ status: 'Closed' });

    expect(invalidRes.status).toBe(409);
    expect(invalidRes.body.error).toMatch(/Invalid status transition/i);
  });

  test('Officer from Ward 2 updating complaint in Ward 1 is rejected (403)', async () => {
    const fileRes = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        category_id: 1,
        ward_id: 1,
        locality: 'Ward 1 Boundary Road',
        description: 'Streetlight off for several days.',
        latitude: 21.1195,
        longitude: 79.0570
      });

    const complaintId = fileRes.body.complaintId;

    // Officer 2 attempts to change status
    const crossWardRes = await request(app)
      .patch(`/api/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${officerWard2Token}`)
      .send({ status: 'In Progress' });

    expect(crossWardRes.status).toBe(403);
    expect(crossWardRes.body.error).toMatch(/assigned ward/i);
  });
});

