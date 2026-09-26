const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

describe('Sales Orders, Concurrency-Safe Reservation & Dispatch (Phase 4)', () => {
  let adminToken = '';
  let salesToken = '';
  let customerId = '';
  let testProduct = null;
  let draftQuotationId = '';
  let acceptedQuotationId = '';
  let salesOrderId = '';

  beforeAll(async () => {
    // 1. Authenticate ADMIN and SALES
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@industrial-erp.com',
      password: 'AdminPassword123!',
    });
    adminToken = adminLogin.body.data.token;

    const salesLogin = await request(app).post('/api/auth/login').send({
      email: 'sales@industrial-erp.com',
      password: 'SalesPassword123!',
    });
    salesToken = salesLogin.body.data.token;

    // 2. Fetch seeded customer
    const custRes = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${salesToken}`);
    customerId = custRes.body.data.customers[0].id;

    // 3. Create a dedicated isolated test product for exact inventory assertions
    testProduct = await prisma.product.create({
      data: {
        productCode: `TEST-PROD-${Date.now()}`,
        productName: 'Heavy Precision Gearbox 50:1',
        category: 'Power Transmission',
        unit: 'Units',
        basePrice: 45000.0,
        inventory: {
          create: {
            physicalQuantity: 100,
            reservedQuantity: 30, // Available = 70
          },
        },
      },
      include: {
        inventory: true,
      },
    });

    // 4. Create a DRAFT quotation
    const draftQuoteRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        validUntil: '2026-12-31',
        items: [{ productId: testProduct.id, quantity: 10, unitPrice: 45000 }],
      });
    draftQuotationId = draftQuoteRes.body.data.quotation.id;

    // 5. Create an ACCEPTED quotation
    const acceptedQuoteRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        validUntil: '2026-12-31',
        items: [{ productId: testProduct.id, quantity: 20, unitPrice: 45000 }],
      });
    acceptedQuotationId = acceptedQuoteRes.body.data.quotation.id;

    await request(app)
      .patch(`/api/quotations/${acceptedQuotationId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });
  });

  afterAll(async () => {
    // Cleanup test product and child references in correct foreign-key order
    if (testProduct) {
      try {
        await prisma.dispatchItem.deleteMany({ where: { productId: testProduct.id } });
        await prisma.dispatch.deleteMany({ where: { salesOrder: { quotation: { items: { some: { productId: testProduct.id } } } } } });
        await prisma.salesOrderItem.deleteMany({ where: { productId: testProduct.id } });
        await prisma.salesOrder.deleteMany({ where: { quotation: { items: { some: { productId: testProduct.id } } } } });
        await prisma.quotationItem.deleteMany({ where: { productId: testProduct.id } });
        await prisma.quotation.deleteMany({ where: { items: { some: { productId: testProduct.id } } } });
        await prisma.inventory.deleteMany({ where: { productId: testProduct.id } });
        await prisma.product.deleteMany({ where: { id: testProduct.id } });
      } catch (e) {
        // Silently ignore cleanup errors if any cascade was already handled
      }
    }
  });

  it('RULE: DRAFT quotation cannot create a Sales Order (400 Bad Request)', async () => {
    const res = await request(app)
      .post(`/api/quotations/${draftQuotationId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Only \'ACCEPTED\' quotations can be converted');
  });

  it('RULE: ACCEPTED quotation can be converted into a Sales Order with PENDING status (201)', async () => {
    const res = await request(app)
      .post(`/api/quotations/${acceptedQuotationId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order.status).toBe('PENDING');
    expect(res.body.data.order.orderNumber).toMatch(/^SO-\d{4}-\d{4}$/);
    expect(res.body.data.order.items.length).toBe(1);

    salesOrderId = res.body.data.order.id;
  });

  it('RULE: Same quotation cannot create duplicate Sales Orders (409 Conflict)', async () => {
    const res = await request(app)
      .post(`/api/quotations/${acceptedQuotationId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Duplicate order prohibited');
  });

  it('RULE: Unauthorized user (SALES) cannot confirm Sales Order (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/sales-orders/${salesOrderId}/confirm`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('RULE: Cannot reserve more inventory than available (409 Conflict)', async () => {
    // Current stock: Physical = 100, Reserved = 30 => Available = 70
    // Create quote for 80 units (exceeds 70 available)
    const quoteOverRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        validUntil: '2026-12-31',
        items: [{ productId: testProduct.id, quantity: 80, unitPrice: 45000 }],
      });
    const quoteOverId = quoteOverRes.body.data.quotation.id;
    await request(app)
      .patch(`/api/quotations/${quoteOverId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });

    const orderOverRes = await request(app)
      .post(`/api/quotations/${quoteOverId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    const orderOverId = orderOverRes.body.data.order.id;

    // Admin tries to confirm order requiring 80 units when only 70 available
    const confirmRes = await request(app)
      .post(`/api/sales-orders/${orderOverId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(confirmRes.statusCode).toBe(409);
    expect(confirmRes.body.success).toBe(false);
    expect(confirmRes.body.message).toContain('Insufficient inventory');
  });

  it('RULE: ADMIN confirming Sales Order increases Reserved Quantity without decreasing Physical Quantity (200)', async () => {
    // salesOrderId requires 20 units
    // Initial: Physical = 100, Reserved = 30, Available = 70
    // Expected after confirm: Physical = 100, Reserved = 50, Available = 50

    const res = await request(app)
      .post(`/api/sales-orders/${salesOrderId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order.status).toBe('CONFIRMED');

    // Verify database inventory counts
    const inv = await prisma.inventory.findUnique({
      where: { productId: testProduct.id },
    });
    expect(inv.physicalQuantity).toBe(100); // Unaltered!
    expect(inv.reservedQuantity).toBe(50);  // Incremented by 20!
  });

  it('RULE: Dispatching Sales Order decreases both Physical and Reserved quantities atomically (201)', async () => {
    // Before dispatch: Physical = 100, Reserved = 50, Available = 50
    // Dispatch 20 units
    // Expected after dispatch: Physical = 80, Reserved = 30, Available = 50

    const res = await request(app)
      .post(`/api/sales-orders/${salesOrderId}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        vehicleNumber: 'MH-12-AB-9876',
        driverName: 'Ramesh Patil',
        notes: 'Dispatched via express freight',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.dispatch.dispatchNumber).toMatch(/^DSP-\d{4}-\d{4}$/);

    // Verify Sales Order status transitioned to DISPATCHED
    const order = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
    });
    expect(order.status).toBe('DISPATCHED');

    // Verify database inventory counts
    const inv = await prisma.inventory.findUnique({
      where: { productId: testProduct.id },
    });
    expect(inv.physicalQuantity).toBe(80); // Decremented by 20!
    expect(inv.reservedQuantity).toBe(30); // Decremented by 20!
  });

  it('RULE: Prevent duplicate dispatch for same Sales Order (400/409)', async () => {
    const res = await request(app)
      .post(`/api/sales-orders/${salesOrderId}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        vehicleNumber: 'MH-12-AB-9876',
        driverName: 'Ramesh Patil',
      });

    expect(res.statusCode).toBe(400); // Already DISPATCHED status
    expect(res.body.success).toBe(false);
  });

  it('BONUS: Concurrency Race Condition Protection (Simultaneous reservation)', async () => {
    // Reset test product inventory: Physical = 100, Reserved = 0 => Available = 100
    await prisma.inventory.update({
      where: { productId: testProduct.id },
      data: { physicalQuantity: 100, reservedQuantity: 0 },
    });

    // Create Order A requiring 80 units
    const qARes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        validUntil: '2026-12-31',
        items: [{ productId: testProduct.id, quantity: 80, unitPrice: 45000 }],
      });
    await request(app)
      .patch(`/api/quotations/${qARes.body.data.quotation.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });
    const orderARes = await request(app)
      .post(`/api/quotations/${qARes.body.data.quotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    const orderAId = orderARes.body.data.order.id;

    // Create Order B requiring 50 units (80 + 50 = 130 > 100 available)
    const qBRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        validUntil: '2026-12-31',
        items: [{ productId: testProduct.id, quantity: 50, unitPrice: 45000 }],
      });
    await request(app)
      .patch(`/api/quotations/${qBRes.body.data.quotation.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });
    const orderBRes = await request(app)
      .post(`/api/quotations/${qBRes.body.data.quotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    const orderBId = orderBRes.body.data.order.id;

    // Execute both confirmation requests simultaneously via Promise.all
    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/sales-orders/${orderAId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`),
      request(app)
        .post(`/api/sales-orders/${orderBId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`),
    ]);

    const statuses = [resA.statusCode, resB.statusCode];

    // Exactly one must succeed (200), and the other must be rejected (409)
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);

    // Verify inventory reserved quantity does NOT exceed 100
    const finalInv = await prisma.inventory.findUnique({
      where: { productId: testProduct.id },
    });
    expect(finalInv.reservedQuantity).toBeLessThanOrEqual(100);
  });
});
