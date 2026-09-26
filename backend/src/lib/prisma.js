const { PrismaClient } = require('@prisma/client');
const config = require('../config/env');

// Prevent multiple instances of Prisma Client in development (due to module reloads)
const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
  });

if (config.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
