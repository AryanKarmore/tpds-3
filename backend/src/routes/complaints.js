const express = require('express');
const { body, query } = require('express-validator');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { uploadComplaintPhotos, uploadStatusPhoto } = require('../middleware/upload');
const complaintService = require('../services/complaintService');
const { isInsideNagpur } = require('../services/ruleEngine');

const router = express.Router();

// 1. Citizen: File a complaint (accepts up to 3 'before' photos)
router.post(
  '/',
  authenticate,
  requireRole('citizen'),
  uploadComplaintPhotos,
  [
    body('category_id').isInt({ min: 1 }).withMessage('Valid category_id is required'),
    body('ward_id').isInt({ min: 1 }).withMessage('Valid ward_id is required'),
    body('locality')
      .trim()
      .isLength({ min: 3, max: 150 })
      .withMessage('Locality must be between 3 and 150 characters'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('Description must be between 10 and 500 characters'),
    body('latitude')
      .isNumeric()
      .withMessage('Latitude must be a valid number'),
    body('longitude')
      .isNumeric()
      .withMessage('Longitude must be a valid number')
      .custom((val, { req }) => {
        if (!isInsideNagpur(req.body.latitude, req.body.longitude)) {
          throw new Error('Location must be within Nagpur');
        }
        return true;
      }),
    validate
  ],
  async (req, res, next) => {
    try {
      const result = await complaintService.createComplaint(
        req.user.id,
        {
          categoryId: parseInt(req.body.category_id, 10),
          wardId: parseInt(req.body.ward_id, 10),
          locality: req.body.locality,
          description: req.body.description,
          latitude: req.body.latitude,
          longitude: req.body.longitude
        },
        req.files || []
      );

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// 2. Citizen: My complaints list
router.get('/mine', authenticate, requireRole('citizen'), async (req, res, next) => {
  try {
    const { status } = req.query;
    const complaints = await complaintService.getCitizenComplaints(req.user.id, status || null);
    res.json({ complaints });
  } catch (err) {
    next(err);
  }
});

// 3. Officer: Queue list
router.get('/', authenticate, requireRole('officer'), async (req, res, next) => {
  try {
    const { ward_id, category_id, status, overdue_only } = req.query;
    const complaints = await complaintService.getOfficerQueue(req.user, {
      ward_id,
      category_id,
      status,
      overdue_only
    });
    res.json({ complaints });
  } catch (err) {
    next(err);
  }
});

// 4. Detail: Both roles (subject to ownership/ward check)
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const complaintId = parseInt(req.params.id, 10);
    if (isNaN(complaintId)) {
      return res.status(400).json({ error: 'Invalid complaint ID' });
    }

    const complaint = await complaintService.getComplaintById(complaintId, req.user);
    res.json({ complaint });
  } catch (err) {
    next(err);
  }
});

// 5. Citizen: Confirm resolution
router.post('/:id/confirm', authenticate, requireRole('citizen'), async (req, res, next) => {
  try {
    const complaintId = parseInt(req.params.id, 10);
    if (isNaN(complaintId)) {
      return res.status(400).json({ error: 'Invalid complaint ID' });
    }

    const result = await complaintService.confirmResolution(complaintId, req.user);
    res.json({
      message: 'Resolution confirmed successfully. Complaint is now Closed.',
      ...result
    });
  } catch (err) {
    next(err);
  }
});

// 6. Citizen: Reject resolution
router.post(
  '/:id/reject',
  authenticate,
  requireRole('citizen'),
  [
    body('reason')
      .trim()
      .isLength({ min: 10 })
      .withMessage('Rejection reason must be at least 10 characters'),
    validate
  ],
  async (req, res, next) => {
    try {
      const complaintId = parseInt(req.params.id, 10);
      if (isNaN(complaintId)) {
        return res.status(400).json({ error: 'Invalid complaint ID' });
      }

      const result = await complaintService.rejectResolution(complaintId, req.user, req.body.reason);
      res.json({
        message: 'Resolution rejected. Complaint has been Reopened.',
        ...result
      });
    } catch (err) {
      next(err);
    }
  }
);

// 7. Officer: Update status (requires 'after' photo if moving to Pending Confirmation)
router.patch(
  '/:id/status',
  authenticate,
  requireRole('officer'),
  uploadStatusPhoto,
  [
    body('status')
      .isIn(['Open', 'In Progress', 'Pending Confirmation', 'Closed', 'Reopened'])
      .withMessage('Invalid status value'),
    body('note')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Note cannot exceed 500 characters'),
    validate
  ],
  async (req, res, next) => {
    try {
      const complaintId = parseInt(req.params.id, 10);
      if (isNaN(complaintId)) {
        return res.status(400).json({ error: 'Invalid complaint ID' });
      }

      const result = await complaintService.updateStatusByOfficer(
        complaintId,
        req.user,
        req.body.status,
        req.body.note,
        req.file
      );

      res.json({
        message: `Status updated to ${req.body.status}`,
        ...result
      });
    } catch (err) {
      next(err);
    }
  }
);

// 8. Post a complaint update / comment
router.post(
  '/:id/updates',
  authenticate,
  [
    body('message')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Message must be between 1 and 500 characters'),
    validate
  ],
  async (req, res, next) => {
    try {
      const complaintId = parseInt(req.params.id, 10);
      if (isNaN(complaintId)) {
        return res.status(400).json({ error: 'Invalid complaint ID' });
      }

      const update = await complaintService.addUpdate(complaintId, req.user, {
        message: req.body.message,
        is_internal: req.body.is_internal
      });

      res.status(201).json({
        message: 'Update posted successfully',
        update
      });
    } catch (err) {
      next(err);
    }
  }
);

// 9. Get complaint updates / comments
router.get('/:id/updates', authenticate, async (req, res, next) => {
  try {
    const complaintId = parseInt(req.params.id, 10);
    if (isNaN(complaintId)) {
      return res.status(400).json({ error: 'Invalid complaint ID' });
    }

    const updates = await complaintService.getUpdates(complaintId, req.user);
    res.json({ updates });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

