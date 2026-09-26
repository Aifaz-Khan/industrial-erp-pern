const { Router } = require('express');
const healthRoutes = require('./healthRoutes');

const router = Router();

// Mount Health Check endpoint
router.use('/health', healthRoutes);

// Subsequent phases will mount:
// router.use('/auth', authRoutes);
// router.use('/customers', customerRoutes);
// router.use('/enquiries', enquiryRoutes);
// router.use('/quotations', quotationRoutes);
// router.use('/sales-orders', salesOrderRoutes);
// router.use('/products', productRoutes);
// router.use('/inventory', inventoryRoutes);

module.exports = router;
