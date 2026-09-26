const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_for_dev_only',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
};

// Validate critical production configurations
if (config.nodeEnv === 'production') {
  if (!process.env.DATABASE_URL) {
    throw new Error('FATAL: DATABASE_URL must be defined in production environment.');
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback_secret_for_dev_only') {
    throw new Error('FATAL: A secure JWT_SECRET must be defined in production environment.');
  }
}

module.exports = config;
