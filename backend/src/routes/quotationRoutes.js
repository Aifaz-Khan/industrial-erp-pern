const { Router } = require('express');
const quotationController = require('../controllers/quotationController');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();

// Protect all quotation routes with authentication
router.use(authenticate);

// POST /api/quotations - Create quotation
router.post('/', quotationController.create);

// GET /api/quotations - List quotations (with optional ?status=)
router.get('/', quotationController.getAll);

// GET /api/quotations/:id - Get quotation details
router.get('/:id', quotationController.getById);

// PATCH /api/quotations/:id/status - Update quotation status
router.patch('/:id/status', quotationController.updateStatus);

module.exports = router;
