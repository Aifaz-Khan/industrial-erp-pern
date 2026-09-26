const { Router } = require('express');
const enquiryController = require('../controllers/enquiryController');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();

// Protect all enquiry routes with authentication
router.use(authenticate);

// POST /api/enquiries - Create enquiry
router.post('/', enquiryController.create);

// GET /api/enquiries - List enquiries (with optional ?status=)
router.get('/', enquiryController.getAll);

// GET /api/enquiries/:id - Get enquiry details
router.get('/:id', enquiryController.getById);

// PATCH /api/enquiries/:id/status - Update enquiry status
router.patch('/:id/status', enquiryController.updateStatus);

module.exports = router;
