const { Router } = require('express');
const productController = require('../controllers/productController');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();

// All inventory routes require valid JWT authentication
router.use(authenticate);

// GET /api/inventory
router.get('/', productController.getInventory);

module.exports = router;
