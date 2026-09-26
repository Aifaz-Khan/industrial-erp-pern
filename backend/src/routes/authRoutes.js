const { Router } = require('express');
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = Router();

// Public Routes
router.post('/login', authController.login);

// Protected Routes (Requires valid JWT)
router.get('/me', authenticate, authController.getMe);

// Role-Restricted Route (Requires valid JWT + ADMIN role)
router.get('/admin-only', authenticate, authorize('ADMIN'), authController.adminOnlyCheck);

module.exports = router;
