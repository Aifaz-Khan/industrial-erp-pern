const { Router } = require('express');
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = Router();

// Protect all sales order routes with authentication
router.use(authenticate);

// GET /api/sales-orders - View all orders (accessible to SALES and ADMIN)
router.get('/', orderController.getAll);

// GET /api/sales-orders/:id - View single order details
router.get('/:id', orderController.getById);

// POST /api/sales-orders/:id/confirm - Confirm order and reserve inventory (ADMIN only)
router.post('/:id/confirm', authorize('ADMIN'), orderController.confirm);

// POST /api/sales-orders/:id/dispatch - Process dispatch (ADMIN only)
router.post('/:id/dispatch', authorize('ADMIN'), orderController.dispatch);

// POST /api/sales-orders/:id/cancel - Cancel order and release stock (ADMIN only)
router.post('/:id/cancel', authorize('ADMIN'), orderController.cancel);

module.exports = router;
