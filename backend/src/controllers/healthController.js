const ApiResponse = require('../utils/apiResponse');
const config = require('../config/env');

/**
 * Health Check Controller
 * Verifies system uptime, process health, and environment status.
 * Used by AWS App Runner, ECS/Beanstalk health probes, and Vercel frontends.
 */
const getHealthStatus = (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.nodeEnv,
    service: 'industrial-erp-backend',
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  };

  return ApiResponse.success(res, 200, 'Server is running smoothly', healthData);
};

module.exports = {
  getHealthStatus,
};
