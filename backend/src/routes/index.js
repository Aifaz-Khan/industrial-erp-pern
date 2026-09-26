const { Router } = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const customerRoutes = require('./customerRoutes');
const productRoutes = require('./productRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const enquiryRoutes = require('./enquiryRoutes');
const quotationRoutes = require('./quotationRoutes');
const orderRoutes = require('./orderRoutes');

const router = Router();

// System Health
router.use('/health', healthRoutes);

// Authentication & Users
router.use('/auth', authRoutes);

// Master Data (Customers, Products, Inventory)
router.use('/customers', customerRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);

// Transactional Workflows
router.use('/enquiries', enquiryRoutes);
router.use('/quotations', quotationRoutes);
router.use('/sales-orders', orderRoutes);

module.exports = router;
