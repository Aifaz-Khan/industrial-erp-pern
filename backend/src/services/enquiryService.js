const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');

class EnquiryService {
  /**
   * Helper to generate sequential Enquiry Number (e.g. ENQ-2026-0001)
   */
  async generateEnquiryNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.enquiry.count();
    const sequence = String(count + 1).padStart(4, '0');
    return `ENQ-${year}-${sequence}`;
  }

  /**
   * Create customer enquiry with line items
   */
  async createEnquiry(userId, data) {
    // 1. Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      throw ApiError.notFound(`Customer with ID '${data.customerId}' does not exist.`);
    }

    // 2. Verify all product IDs exist
    const productIds = data.items.map((i) => i.productId);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (existingProducts.length !== productIds.length) {
      throw ApiError.badRequest('One or more product IDs provided do not exist.');
    }

    // 3. Generate unique enquiry number
    let enquiryNumber = await this.generateEnquiryNumber();
    let exists = await prisma.enquiry.findUnique({ where: { enquiryNumber } });
    let attempt = 1;
    while (exists) {
      const year = new Date().getFullYear();
      const count = (await prisma.enquiry.count()) + attempt;
      enquiryNumber = `ENQ-${year}-${String(count).padStart(4, '0')}`;
      exists = await prisma.enquiry.findUnique({ where: { enquiryNumber } });
      attempt++;
    }

    // 4. Create enquiry and items in single atomic transaction
    return prisma.enquiry.create({
      data: {
        enquiryNumber,
        customerId: data.customerId,
        createdById: userId,
        requiredDate: data.requiredDate ? new Date(data.requiredDate) : null,
        notes: data.notes || null,
        status: 'NEW',
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            targetPrice: item.targetPrice !== undefined ? item.targetPrice : null,
          })),
        },
      },
      include: {
        customer: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Retrieve all enquiries with filtering
   */
  async getAllEnquiries(statusFilter) {
    const where = statusFilter ? { status: statusFilter } : {};

    return prisma.enquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            city: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                productCode: true,
                productName: true,
                unit: true,
              },
            },
          },
        },
        _count: {
          select: {
            quotations: true,
          },
        },
      },
    });
  }

  /**
   * Retrieve single enquiry by ID
   */
  async getEnquiryById(id) {
    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        quotations: {
          select: {
            id: true,
            quotationNumber: true,
            grandTotal: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!enquiry) {
      throw ApiError.notFound(`Enquiry with ID '${id}' not found`);
    }

    return enquiry;
  }

  /**
   * Update enquiry status
   */
  async updateEnquiryStatus(id, newStatus) {
    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
    });

    if (!enquiry) {
      throw ApiError.notFound(`Enquiry with ID '${id}' not found`);
    }

    return prisma.enquiry.update({
      where: { id },
      data: { status: newStatus },
      include: {
        customer: true,
        items: true,
      },
    });
  }
}

module.exports = new EnquiryService();
