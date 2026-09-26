const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');

class OrderService {
  /**
   * Helper to generate unique sequential Order Number (e.g. SO-2026-0001)
   */
  async generateOrderNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.salesOrder.count();
    const sequence = String(count + 1).padStart(4, '0');
    return `SO-${year}-${sequence}`;
  }

  /**
   * Helper to generate unique sequential Dispatch Number (e.g. DSP-2026-0001)
   */
  async generateDispatchNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.dispatch.count();
    const sequence = String(count + 1).padStart(4, '0');
    return `DSP-${year}-${sequence}`;
  }

  /**
   * 1. Convert Accepted Quotation to Sales Order
   * Rules:
   * - Only ACCEPTED quotation can create a Sales Order.
   * - DRAFT or REJECTED quotation cannot create a Sales Order.
   * - One quotation cannot generate multiple Sales Orders (enforced at DB level).
   */
  async convertQuotationToSalesOrder(userId, quotationId) {
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        salesOrder: true,
      },
    });

    if (!quotation) {
      throw ApiError.notFound(`Quotation with ID '${quotationId}' not found.`);
    }

    if (quotation.status !== 'ACCEPTED') {
      throw ApiError.badRequest(
        `Cannot convert quotation to Sales Order: Quotation status is '${quotation.status}'. Only 'ACCEPTED' quotations can be converted.`
      );
    }

    if (quotation.salesOrder) {
      throw ApiError.conflict(
        `Duplicate order prohibited: Quotation '${quotation.quotationNumber}' has already been converted into Sales Order '${quotation.salesOrder.orderNumber}'.`
      );
    }

    let orderNumber = await this.generateOrderNumber();
    let exists = await prisma.salesOrder.findUnique({ where: { orderNumber } });
    let attempt = 1;
    while (exists) {
      const year = new Date().getFullYear();
      const count = (await prisma.salesOrder.count()) + attempt;
      orderNumber = `SO-${year}-${String(count).padStart(4, '0')}`;
      exists = await prisma.salesOrder.findUnique({ where: { orderNumber } });
      attempt++;
    }

    return prisma.salesOrder.create({
      data: {
        orderNumber,
        quotationId: quotation.id,
        customerId: quotation.customerId,
        totalAmount: quotation.grandTotal,
        status: 'PENDING',
        items: {
          create: quotation.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        quotation: {
          select: {
            id: true,
            quotationNumber: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * 2. Retrieve All Sales Orders
   */
  async getAllSalesOrders(statusFilter) {
    const where = statusFilter ? { status: statusFilter } : {};

    return prisma.salesOrder.findMany({
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
        confirmedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        dispatch: {
          select: {
            id: true,
            dispatchNumber: true,
            dispatchDate: true,
            vehicleNumber: true,
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
   * 3. Retrieve Single Sales Order by ID
   */
  async getSalesOrderById(id) {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        confirmedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        quotation: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        items: {
          include: {
            product: {
              include: {
                inventory: true,
              },
            },
          },
        },
        dispatch: {
          include: {
            dispatchedBy: {
              select: {
                id: true,
                name: true,
              },
            },
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw ApiError.notFound(`Sales Order with ID '${id}' not found.`);
    }

    return order;
  }

  /**
   * 4. Confirm Sales Order & Reserve Inventory (ADMIN only)
   * 
   * Concurrency Protection:
   * Uses PostgreSQL Row-Level Locking (`SELECT ... FOR UPDATE`) inside a Prisma
   * interactive transaction to eliminate double-reservation race conditions.
   */
  async confirmSalesOrder(userId, orderId) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw ApiError.notFound(`Sales Order with ID '${orderId}' not found.`);
    }

    if (order.status !== 'PENDING') {
      throw ApiError.badRequest(
        `Cannot confirm order: Current status is '${order.status}'. Only 'PENDING' orders can be confirmed.`
      );
    }

    // Execute concurrency-safe stock reservation within an interactive transaction
    return prisma.$transaction(async (tx) => {
      // 1. Lock each product's inventory row using SELECT ... FOR UPDATE
      for (const item of order.items) {
        const rows = await tx.$queryRaw`
          SELECT id, "productId", "physicalQuantity", "reservedQuantity"
          FROM "Inventory"
          WHERE "productId" = ${item.productId}
          FOR UPDATE
        `;

        if (!rows || rows.length === 0) {
          throw ApiError.notFound(
            `Inventory record for product '${item.product.productName}' (${item.product.productCode}) not found.`
          );
        }

        const inventory = rows[0];
        const physical = inventory.physicalQuantity;
        const reserved = inventory.reservedQuantity;
        const available = physical - reserved;

        // Check if sufficient stock is available
        if (item.quantity > available) {
          throw ApiError.conflict(
            `Insufficient inventory for product '${item.product.productName}' (${item.product.productCode}). Required: ${item.quantity}, Available: ${available} (Physical: ${physical}, Reserved: ${reserved}).`
          );
        }

        // Increment reservedQuantity without altering physicalQuantity
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            reservedQuantity: {
              increment: item.quantity,
            },
          },
        });
      }

      // 2. Transition Sales Order status to CONFIRMED
      const confirmedOrder = await tx.salesOrder.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED',
          confirmedById: userId,
          confirmedAt: new Date(),
        },
        include: {
          customer: true,
          items: {
            include: {
              product: {
                include: {
                  inventory: true,
                },
              },
            },
          },
        },
      });

      return confirmedOrder;
    });
  }

  /**
   * 5. Process Dispatch (ADMIN only)
   * 
   * Decrements physicalQuantity and reservedQuantity by dispatched quantity.
   */
  async dispatchSalesOrder(userId, orderId, dispatchData) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        dispatch: true,
      },
    });

    if (!order) {
      throw ApiError.notFound(`Sales Order with ID '${orderId}' not found.`);
    }

    if (order.status !== 'CONFIRMED') {
      throw ApiError.badRequest(
        `Cannot dispatch order: Current status is '${order.status}'. Only 'CONFIRMED' orders can be dispatched.`
      );
    }

    if (order.dispatch) {
      throw ApiError.conflict(
        `Duplicate dispatch prohibited: Sales Order '${order.orderNumber}' has already been dispatched under '${order.dispatch.dispatchNumber}'.`
      );
    }

    let dispatchNumber = await this.generateDispatchNumber();
    let exists = await prisma.dispatch.findUnique({ where: { dispatchNumber } });
    let attempt = 1;
    while (exists) {
      const year = new Date().getFullYear();
      const count = (await prisma.dispatch.count()) + attempt;
      dispatchNumber = `DSP-${year}-${String(count).padStart(4, '0')}`;
      exists = await prisma.dispatch.findUnique({ where: { dispatchNumber } });
      attempt++;
    }

    return prisma.$transaction(async (tx) => {
      // 1. Lock and decrement physicalQuantity and reservedQuantity
      for (const item of order.items) {
        const rows = await tx.$queryRaw`
          SELECT id, "productId", "physicalQuantity", "reservedQuantity"
          FROM "Inventory"
          WHERE "productId" = ${item.productId}
          FOR UPDATE
        `;

        const inv = rows[0];
        if (item.quantity > inv.reservedQuantity) {
          throw ApiError.conflict(
            `Dispatch exceeds reserved stock for product '${item.product.productCode}'. Dispatched: ${item.quantity}, Reserved: ${inv.reservedQuantity}`
          );
        }

        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            physicalQuantity: { decrement: item.quantity },
            reservedQuantity: { decrement: item.quantity },
          },
        });
      }

      // 2. Create Dispatch record
      const dispatchRecord = await tx.dispatch.create({
        data: {
          dispatchNumber,
          salesOrderId: order.id,
          vehicleNumber: dispatchData.vehicleNumber,
          driverName: dispatchData.driverName,
          notes: dispatchData.notes || null,
          dispatchedById: userId,
          items: {
            create: order.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // 3. Update Sales Order status to DISPATCHED
      await tx.salesOrder.update({
        where: { id: orderId },
        data: { status: 'DISPATCHED' },
      });

      return dispatchRecord;
    });
  }

  /**
   * 6. Cancel Sales Order (ADMIN only)
   * If order was CONFIRMED, releases reserved inventory back to available stock.
   */
  async cancelSalesOrder(userId, orderId) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw ApiError.notFound(`Sales Order with ID '${orderId}' not found.`);
    }

    if (order.status === 'DISPATCHED') {
      throw ApiError.badRequest('Cannot cancel an order that has already been DISPATCHED.');
    }

    if (order.status === 'CANCELLED') {
      return order; // Idempotent no-op
    }

    return prisma.$transaction(async (tx) => {
      // If the order was CONFIRMED, release the reserved inventory
      if (order.status === 'CONFIRMED') {
        for (const item of order.items) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: {
              reservedQuantity: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      return tx.salesOrder.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });
    });
  }
}

module.exports = new OrderService();
