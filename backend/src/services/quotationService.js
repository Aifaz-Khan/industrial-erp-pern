const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');
const { calculateQuotationTotals } = require('../utils/quotationCalculator');

class QuotationService {
  /**
   * Helper to generate unique sequential Quotation Number (e.g. QT-2026-0001)
   */
  async generateQuotationNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.quotation.count();
    const sequence = String(count + 1).padStart(4, '0');
    return `QT-${year}-${sequence}`;
  }

  /**
   * Create a new quotation with server-calculated totals
   */
  async createQuotation(userId, data) {
    // 1. Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      throw ApiError.notFound(`Customer with ID '${data.customerId}' does not exist.`);
    }

    // 2. If linked to an enquiry, verify enquiry exists
    let enquiry = null;
    if (data.enquiryId) {
      enquiry = await prisma.enquiry.findUnique({
        where: { id: data.enquiryId },
      });
      if (!enquiry) {
        throw ApiError.notFound(`Linked Enquiry with ID '${data.enquiryId}' does not exist.`);
      }
    }

    // 3. Verify all products exist
    const productIds = data.items.map((i) => i.productId);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (existingProducts.length !== productIds.length) {
      throw ApiError.badRequest('One or more product IDs provided do not exist.');
    }

    // 4. Compute financial totals strictly on the server
    const financials = calculateQuotationTotals({
      items: data.items,
      discountPercentage: data.discountPercentage,
      taxPercentage: data.taxPercentage,
    });

    // 5. Generate unique quotation number
    let quotationNumber = await this.generateQuotationNumber();
    let exists = await prisma.quotation.findUnique({ where: { quotationNumber } });
    let attempt = 1;
    while (exists) {
      const year = new Date().getFullYear();
      const count = (await prisma.quotation.count()) + attempt;
      quotationNumber = `QT-${year}-${String(count).padStart(4, '0')}`;
      exists = await prisma.quotation.findUnique({ where: { quotationNumber } });
      attempt++;
    }

    // 6. Execute atomic creation & enquiry status update in Prisma Transaction
    const newQuotation = await prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.create({
        data: {
          quotationNumber,
          customerId: data.customerId,
          enquiryId: data.enquiryId || null,
          createdById: userId,
          validUntil: new Date(data.validUntil),
          status: 'DRAFT',
          subtotal: financials.subtotal,
          discountPercentage: financials.discountPercentage,
          discountAmount: financials.discountAmount,
          taxPercentage: financials.taxPercentage,
          taxAmount: financials.taxAmount,
          grandTotal: financials.grandTotal,
          notes: data.notes || null,
          items: {
            create: financials.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
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

      // If linked to an enquiry, transition enquiry status from NEW to QUOTED
      if (data.enquiryId && enquiry.status === 'NEW') {
        await tx.enquiry.update({
          where: { id: data.enquiryId },
          data: { status: 'QUOTED' },
        });
      }

      return quote;
    });

    return newQuotation;
  }

  /**
   * Retrieve all quotations with optional status filtering
   */
  async getAllQuotations(statusFilter) {
    const where = statusFilter ? { status: statusFilter } : {};

    return prisma.quotation.findMany({
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
        enquiry: {
          select: {
            id: true,
            enquiryNumber: true,
          },
        },
        salesOrder: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    });
  }

  /**
   * Retrieve single quotation by ID
   */
  async getQuotationById(id) {
    const quote = await prisma.quotation.findUnique({
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
        enquiry: true,
        salesOrder: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            orderDate: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quote) {
      throw ApiError.notFound(`Quotation with ID '${id}' not found`);
    }

    return quote;
  }

  /**
   * Update quotation status with ERP workflow state machine checks
   * DRAFT -> SENT -> ACCEPTED / REJECTED
   */
  async updateQuotationStatus(id, newStatus) {
    const quote = await prisma.quotation.findUnique({
      where: { id },
      include: {
        salesOrder: true,
      },
    });

    if (!quote) {
      throw ApiError.notFound(`Quotation with ID '${id}' not found`);
    }

    // Rule: Cannot modify status of a quotation already converted into a Sales Order
    if (quote.salesOrder) {
      throw ApiError.conflict(
        `Cannot modify status: Quotation '${quote.quotationNumber}' is already converted into Sales Order '${quote.salesOrder.orderNumber}'.`
      );
    }

    // Workflow State Machine Validation
    if (quote.status === newStatus) {
      return quote; // Idempotent no-op
    }

    if (quote.status === 'REJECTED') {
      throw ApiError.badRequest('Cannot transition from REJECTED status. Please create a new quotation revision.');
    }

    return prisma.$transaction(async (tx) => {
      const updatedQuote = await tx.quotation.update({
        where: { id },
        data: { status: newStatus },
        include: {
          customer: true,
          items: true,
        },
      });

      // If quotation is ACCEPTED, also update linked enquiry to WON
      if (newStatus === 'ACCEPTED' && quote.enquiryId) {
        await tx.enquiry.update({
          where: { id: quote.enquiryId },
          data: { status: 'WON' },
        });
      }

      // If quotation is REJECTED and linked to an enquiry, check if other active quotations exist
      if (newStatus === 'REJECTED' && quote.enquiryId) {
        const otherActiveQuotes = await tx.quotation.findMany({
          where: {
            enquiryId: quote.enquiryId,
            id: { not: id },
            status: { in: ['DRAFT', 'SENT', 'ACCEPTED'] },
          },
        });

        if (otherActiveQuotes.length === 0) {
          await tx.enquiry.update({
            where: { id: quote.enquiryId },
            data: { status: 'LOST' },
          });
        }
      }

      return updatedQuote;
    });
  }
}

module.exports = new QuotationService();
