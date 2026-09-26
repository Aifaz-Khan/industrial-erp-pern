const { Router } = require('express');
const customerController = require('../controllers/customerController');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();

// Protect all customer routes with JWT authentication
router.use(authenticate);

// POST /api/customers - Create new customer (SALES, ADMIN)
router.post('/', customerController.create);

// GET /api/customers - Get list of customers (with optional ?search=)
router.get('/', customerController.getAll);

// GET /api/customers/:id - Get customer details
router.get('/:id', customerController.getById);

module.exports = router;
