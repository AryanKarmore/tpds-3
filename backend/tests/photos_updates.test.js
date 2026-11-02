const request = require('supertest');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');
const pool = require('../src/config/db');
const { UPLOADS_DIR } = require('../src/services/photoService');

describe('Photos & Updates (Comments) Features', () => {
  let citizen1Token;
  let citizen2Token;
  let officerWard1Token;
  let officerWard2Token;
  let validJpg;
  let validPng;
  let validWebp;

  beforeAll(async () => {
    // Tokens
    const c1 = await request(app).post('/api/auth/citizen/login').send({
      email: 'citizen1@civictrack.test',
      password: 'Citizen@123'
    });
    citizen1Token = c1.body.token;

    const c2 = await request(app).post('/api/auth/citizen/login').send({
      email: 'citizen2@civictrack.test',
      password: 'Citizen@123'
    });
    citizen2Token = c2.body.token;

    const o1 = await request(app).post('/api/auth/officer/login').send({
      email: 'officer1@civictrack.test',
      password: 'Officer@123'
    });
    officerWard1Token = o1.body.token;

    const o2 = await request(app).post('/api/auth/officer/login').send({
      email: 'officer2@civictrack.test',
      password: 'Officer@123'
    });
    officerWard2Token = o2.body.token;

    // Create valid test image buffers
    validJpg = await sharp({
      create: { width: 50, height: 50, channels: 3, background: { r: 255, g: 0, b: 0 } }
    }).jpeg().toBuffer();

    validPng = await sharp({
      create: { width: 50, height: 50, channels: 3, background: { r: 0, g: 255, b: 0 } }
    }).png().toBuffer();

    validWebp = await sharp({
      create: { width: 50, height: 50, channels: 3, background: { r: 0, g: 0, b: 255 } }
    }).webp().toBuffer();
  });

  describe('1. Photo Uploads & Validation', () => {
    test('Fake image (PDF renamed to .jpg) is rejected by signature check (400)', async () => {
      // PDF magic bytes: %PDF-1.5
      const fakePdfBuffer = Buffer.from('%PDF-1.5 fake pdf file content for testing signature rejection');

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .field('category_id', '1')
        .field('ward_id', '1')
        .field('locality', 'Pratap Nagar East')
        .field('description', 'Testing signature validation with fake JPG')
        .field('latitude', '21.1180')
        .field('longitude', '79.0550')
        .attach('photos', fakePdfBuffer, 'fake_invoice.jpg');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/signature/i);
    });

    test('Fake image (EXE binary renamed to .png) is rejected by signature check (400)', async () => {
      // EXE magic bytes: MZ
      const fakeExeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .field('category_id', '1')
        .field('ward_id', '1')
        .field('locality', 'Pratap Nagar East')
        .field('description', 'Testing signature validation with fake PNG')
        .field('latitude', '21.1180')
        .field('longitude', '79.0550')
        .attach('photos', fakeExeBuffer, 'malware.png');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/signature/i);
    });

    test('Boundary: File size limit 5 MB accepted vs 5.1 MB rejected (400)', async () => {
      // 5.1 MB buffer (> 5 * 1024 * 1024 = 5242880)
      const oversizedBuffer = Buffer.alloc(5.1 * 1024 * 1024, 0);
      // Put JPEG magic header so it passes signature if it were checked
      oversizedBuffer[0] = 0xFF;
      oversizedBuffer[1] = 0xD8;
      oversizedBuffer[2] = 0xFF;

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .field('category_id', '1')
        .field('ward_id', '1')
        .field('locality', 'Pratap Nagar Oversize')
        .field('description', 'Testing 5.1 MB file upload rejection')
        .field('latitude', '21.1180')
        .field('longitude', '79.0550')
        .attach('photos', oversizedBuffer, 'oversized.jpg');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/5 MB limit/i);
    });

    test('Boundary: Up to 3 photos accepted, 4th photo rejected (400)', async () => {
      // 4 photos
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .field('category_id', '1')
        .field('ward_id', '1')
        .field('locality', 'Pratap Nagar Max Photos')
        .field('description', 'Testing max photos boundary with 4 photos')
        .field('latitude', '21.1180')
        .field('longitude', '79.0550')
        .attach('photos', validJpg, 'img1.jpg')
        .attach('photos', validPng, 'img2.png')
        .attach('photos', validWebp, 'img3.webp')
        .attach('photos', validJpg, 'img4.jpg');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Maximum 3 photos/i);
    });

    test('Successful submission with 2 valid photos and EXIF stripping', async () => {
      // Create image with EXIF metadata
      const imageWithExif = await sharp({
        create: { width: 30, height: 30, channels: 3, background: { r: 120, g: 80, b: 200 } }
      })
        .withMetadata({
          exif: {
            IFD0: {
              Artist: 'Test Citizen Device',
              Copyright: 'CivicTrack Test EXIF'
            }
          }
        })
        .jpeg()
        .toBuffer();

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .field('category_id', '3')
        .field('ward_id', '1')
        .field('locality', 'Pratap Nagar Square Photo Test')
        .field('description', 'Pothole complaint with photo attachment')
        .field('latitude', '21.1182')
        .field('longitude', '79.0552')
        .attach('photos', imageWithExif, 'exif_test.jpg')
        .attach('photos', validPng, 'pothole_angle2.png');

      expect(res.status).toBe(201);
      const complaintId = res.body.complaintId;

      // Verify detail returns photos
      const detailRes = await request(app)
        .get(`/api/complaints/${complaintId}`)
        .set('Authorization', `Bearer ${citizen1Token}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.complaint.photos).toBeDefined();
      expect(detailRes.body.complaint.photos.length).toBe(2);
      expect(detailRes.body.complaint.photos[0].type).toBe('before');

      // Verify EXIF was stripped from the saved disk file
      const savedFilePath = detailRes.body.complaint.photos[0].file_path; // e.g. /uploads/uuid.jpg
      const fullDiskPath = path.join(UPLOADS_DIR, path.basename(savedFilePath));
      expect(fs.existsSync(fullDiskPath)).toBe(true);

      const savedMeta = await sharp(fullDiskPath).metadata();
      expect(savedMeta.exif).toBeUndefined(); // EXIF is completely stripped!
    });

    test('Officer resolving: moving to Pending Confirmation without after-photo returns 400', async () => {
      // File complaint
      const fileRes = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({
          category_id: 1,
          ward_id: 1,
          locality: 'Streetlight pole 12',
          description: 'Streetlight out near corner',
          latitude: 21.1185,
          longitude: 79.0555
        });

      const complaintId = fileRes.body.complaintId;

      // Move to In Progress
      await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${officerWard1Token}`)
        .field('status', 'In Progress');

      // Attempt to move to Pending Confirmation WITHOUT an after-photo -> MUST FAIL WITH 400
      const missingPhotoRes = await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${officerWard1Token}`)
        .field('status', 'Pending Confirmation')
        .field('note', 'Repair finished but forgot photo');

      expect(missingPhotoRes.status).toBe(400);
      expect(missingPhotoRes.body.error).toMatch(/after.*photo.*required/i);

      // Now supply the required after-photo -> MUST SUCCEED
      const successResolve = await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${officerWard1Token}`)
        .field('status', 'Pending Confirmation')
        .field('note', 'New LED fixture installed')
        .attach('photo', validJpg, 'repaired_lamp.jpg');

      expect(successResolve.status).toBe(200);
      expect(successResolve.body.status).toBe('Pending Confirmation');

      // Verify detail returns both before/after photos correctly
      const detailRes = await request(app)
        .get(`/api/complaints/${complaintId}`)
        .set('Authorization', `Bearer ${officerWard1Token}`);

      const afterPhoto = detailRes.body.complaint.photos.find(p => p.type === 'after');
      expect(afterPhoto).toBeDefined();
    });
  });

  describe('2. Complaint Updates (Comments)', () => {
    let complaintId;

    beforeAll(async () => {
      const fileRes = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({
          category_id: 2,
          ward_id: 1,
          locality: 'Garbage Dump Sector 3',
          description: 'Accumulated trash pile overflowing onto street.',
          latitude: 21.1188,
          longitude: 79.0558
        });
      complaintId = fileRes.body.complaintId;
    });

    test('Boundary: Empty message rejected (400)', async () => {
      const res = await request(app)
        .post(`/api/complaints/${complaintId}/updates`)
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({ message: '   ' });

      expect(res.status).toBe(400);
    });

    test('Boundary: Message 500 characters accepted vs 501 rejected (400)', async () => {
      // 501 characters -> rejected
      const long501 = 'a'.repeat(501);
      const res501 = await request(app)
        .post(`/api/complaints/${complaintId}/updates`)
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({ message: long501 });

      expect(res501.status).toBe(400);

      // 500 characters -> accepted
      const valid500 = 'b'.repeat(500);
      const res500 = await request(app)
        .post(`/api/complaints/${complaintId}/updates`)
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({ message: valid500 });

      expect(res500.status).toBe(201);
      expect(res500.body.update.message.length).toBe(500);
    });

    test('Citizen posting on another citizen complaint is rejected (403)', async () => {
      const res = await request(app)
        .post(`/api/complaints/${complaintId}/updates`)
        .set('Authorization', `Bearer ${citizen2Token}`)
        .send({ message: 'Trying to comment on Citizen 1 complaint' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/own complaints/i);
    });

    test('Officer from another ward posting update is rejected (403)', async () => {
      // Complaint is in Ward 1; Officer 2 is in Ward 2
      const res = await request(app)
        .post(`/api/complaints/${complaintId}/updates`)
        .set('Authorization', `Bearer ${officerWard2Token}`)
        .send({ message: 'Cross-ward comment attempt' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/assigned ward/i);
    });

    test('Internal notes: Officer can mark update internal; Citizen cannot see it', async () => {
      // Officer posts public update
      await request(app)
        .post(`/api/complaints/${complaintId}/updates`)
        .set('Authorization', `Bearer ${officerWard1Token}`)
        .send({ message: 'Crew has been dispatched to site.', is_internal: false });

      // Officer posts internal update
      await request(app)
        .post(`/api/complaints/${complaintId}/updates`)
        .set('Authorization', `Bearer ${officerWard1Token}`)
        .send({ message: 'Internal Note: Truck hydraulic lift is leaking oil.', is_internal: true });

      // Officer retrieves updates: sees both public and internal
      const officerView = await request(app)
        .get(`/api/complaints/${complaintId}/updates`)
        .set('Authorization', `Bearer ${officerWard1Token}`);

      expect(officerView.status).toBe(200);
      const internalSeenByOfficer = officerView.body.updates.some(u => u.is_internal === 1 || u.is_internal === true);
      expect(internalSeenByOfficer).toBe(true);

      // Citizen retrieves updates: DOES NOT SEE internal note
      const citizenView = await request(app)
        .get(`/api/complaints/${complaintId}/updates`)
        .set('Authorization', `Bearer ${citizen1Token}`);

      expect(citizenView.status).toBe(200);
      const internalSeenByCitizen = citizenView.body.updates.some(u => u.is_internal === 1 || u.is_internal === true);
      expect(internalSeenByCitizen).toBe(false);
      expect(citizenView.body.updates.some(u => u.message.includes('hydraulic lift'))).toBe(false);
    });

    test('Posting updates on Closed complaints is rejected (400)', async () => {
      // Move complaint to Closed
      await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${officerWard1Token}`)
        .field('status', 'In Progress');

      await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${officerWard1Token}`)
        .field('status', 'Pending Confirmation')
        .attach('photo', validJpg, 'done.jpg');

      await request(app)
        .post(`/api/complaints/${complaintId}/confirm`)
        .set('Authorization', `Bearer ${citizen1Token}`);

      // Now complaint is Closed. Attempt to post update -> MUST FAIL
      const postOnClosed = await request(app)
        .post(`/api/complaints/${complaintId}/updates`)
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({ message: 'Trying to comment after closed' });

      expect(postOnClosed.status).toBe(400);
      expect(postOnClosed.body.error).toMatch(/closed complaints/i);
    });
  });
});
