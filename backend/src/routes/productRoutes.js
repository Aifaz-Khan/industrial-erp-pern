const { Router } = require('express');
const productController = require('../controllers/productController');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();

// All product routes require valid JWT authentication
router.use(authenticate);

// GET /api/products
router.get('/', productController.getAll);

// GET /api/products/:id
router.get('/:id', productController.getById);

module.exports = router;
