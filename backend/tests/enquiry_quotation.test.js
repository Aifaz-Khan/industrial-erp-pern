const request = require('supertest');
const app = require('../src/app');

describe('Customer Enquiries & Quotation Engine (Phase 3)', () => {
  let salesToken = '';
  let customerId = '';
  let productA = null;
  let productB = null;
  let createdEnquiryId = '';
  let createdQuotationId = '';

  beforeAll(async () => {
    // 1. Authenticate as SALES user
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'sales@industrial-erp.com',
      password: 'SalesPassword123!',
    });
    salesToken = loginRes.body.data.token;

    // 2. Fetch available products
    const prodRes = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${salesToken}`);
    
    productA = prodRes.body.data.products[0]; // e.g. IND-CON-004 or IND-HYD-005
    productB = prodRes.body.data.products[1];

    // 3. Fetch seeded customer
    const custRes = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${salesToken}`);
    
    customerId = custRes.body.data.customers[0].id;
  });

  it('GET /api/inventory should return computed availableQuantity = physical - reserved', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.inventory.length).toBeGreaterThan(0);

    const firstItem = res.body.data.inventory[0];
    expect(firstItem).toHaveProperty('physicalQuantity');
    expect(firstItem).toHaveProperty('reservedQuantity');
    expect(firstItem.availableQuantity).toBe(
      firstItem.physicalQuantity - firstItem.reservedQuantity
    );
  });

  it('POST /api/customers should create a new customer', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        companyName: 'Tata Steel Processing Ltd',
        contactPerson: 'Anand Kulkarni',
        mobile: '+91 99223 34455',
        email: `tata_proc_${Date.now()}@tatasteel.com`,
        city: 'Jamshedpur',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.customer).toHaveProperty('id');
    expect(res.body.data.customer.companyName).toBe('Tata Steel Processing Ltd');
  });

  it('POST /api/enquiries should create enquiry with multiple items and status NEW', async () => {
    const res = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        requiredDate: '2026-10-15',
        notes: 'Urgent factory line expansion requirement',
        items: [
          { productId: productA.id, quantity: 5, targetPrice: 18000 },
          { productId: productB.id, quantity: 2, targetPrice: 24000 },
        ],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.enquiry.status).toBe('NEW');
    expect(res.body.data.enquiry.enquiryNumber).toMatch(/^ENQ-\d{4}-\d{4}$/);
    expect(res.body.data.enquiry.items.length).toBe(2);

    createdEnquiryId = res.body.data.enquiry.id;
  });

  it('POST /api/quotations should accurately calculate Subtotal, Discount, GST 18%, and Grand Total strictly on backend', async () => {
    // Product A: 2 units @ 10,000 = 20,000
    // Product B: 1 unit @ 5,000 = 5,000
    // Subtotal = 25,000.00
    // Discount 10% = 2,500.00
    // Taxable Amount = 22,500.00
    // GST 18% = 4,050.00
    // Grand Total = 26,550.00

    const res = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        enquiryId: createdEnquiryId,
        validUntil: '2026-11-30',
        discountPercentage: 10,
        taxPercentage: 18,
        notes: 'Commercial terms: 30 days credit',
        // Client attempts to send forged or tampered total values
        forgedGrandTotal: 1.0,
        items: [
          { productId: productA.id, quantity: 2, unitPrice: 10000 },
          { productId: productB.id, quantity: 1, unitPrice: 5000 },
        ],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);

    const quote = res.body.data.quotation;
    expect(quote.quotationNumber).toMatch(/^QT-\d{4}-\d{4}$/);
    expect(quote.status).toBe('DRAFT');

    // Strict numerical assertions
    expect(parseFloat(quote.subtotal)).toBe(25000.0);
    expect(parseFloat(quote.discountPercentage)).toBe(10.0);
    expect(parseFloat(quote.discountAmount)).toBe(2500.0);
    expect(parseFloat(quote.taxPercentage)).toBe(18.0);
    expect(parseFloat(quote.taxAmount)).toBe(4050.0);
    expect(parseFloat(quote.grandTotal)).toBe(26550.0);

    // Verify linked enquiry automatically transitioned from NEW to QUOTED
    const enqRes = await request(app)
      .get(`/api/enquiries/${createdEnquiryId}`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(enqRes.body.data.enquiry.status).toBe('QUOTED');

    createdQuotationId = quote.id;
  });

  it('PATCH /api/quotations/:id/status should update status and transition linked enquiry to WON when ACCEPTED', async () => {
    // 1. Transition DRAFT -> SENT
    const sentRes = await request(app)
      .patch(`/api/quotations/${createdQuotationId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'SENT' });

    expect(sentRes.statusCode).toBe(200);
    expect(sentRes.body.data.quotation.status).toBe('SENT');

    // 2. Transition SENT -> ACCEPTED
    const acceptRes = await request(app)
      .patch(`/api/quotations/${createdQuotationId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });

    expect(acceptRes.statusCode).toBe(200);
    expect(acceptRes.body.data.quotation.status).toBe('ACCEPTED');

    // 3. Verify linked enquiry automatically transitioned to WON
    const enqRes = await request(app)
      .get(`/api/enquiries/${createdEnquiryId}`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(enqRes.body.data.enquiry.status).toBe('WON');
  });

  it('POST /api/quotations should fail with 400 when items array is empty', async () => {
    const res = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        validUntil: '2026-11-30',
        items: [],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
