const app = require('./app');
const config = require('./config/env');

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(`[INFO] Industrial ERP Backend Server Started`);
  console.log(`[INFO] Environment:  ${config.nodeEnv}`);
  console.log(`[INFO] Local URL:    http://localhost:${config.port}`);
  console.log(`[INFO] Health Check: http://localhost:${config.port}/api/health`);
  console.log(`=================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[ERROR] Port ${config.port} is already in use.`);
    console.error(`[INFO] Tip for macOS users: macOS AirPlay Receiver occupies port 5000 by default.`);
    console.error(`[INFO] Set PORT=5001 in your .env file or disable AirPlay Receiver in macOS System Settings.`);
  } else {
    console.error('[ERROR] Server startup error:', err);
  }
  process.exit(1);
});

// Graceful shutdown management for AWS / Docker container lifecycle
const handleGracefulShutdown = (signal) => {
  console.log(`\n[INFO] Received ${signal}. Commencing graceful server shutdown...`);
  server.close(() => {
    console.log('[INFO] HTTP server closed. Cleanup finished. Process exiting cleanly.');
    process.exit(0);
  });

  // Force close if cleanup takes longer than 10 seconds
  setTimeout(() => {
    console.error('[WARN] Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

module.exports = server;
