const { Router } = require('express');
const { getHealthStatus } = require('../controllers/healthController');

const router = Router();

// GET /api/health
router.get('/', getHealthStatus);

module.exports = router;
