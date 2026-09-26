const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');

class CustomerService {
  /**
   * Create a new corporate customer
   */
  async createCustomer(data) {
    const existing = await prisma.customer.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw ApiError.conflict(`A customer with email '${data.email}' already exists.`);
    }

    return prisma.customer.create({
      data,
    });
  }

  /**
   * Get all customers with optional search filter
   */
  async getAllCustomers(search = '') {
    const where = search
      ? {
          OR: [
            { companyName: { contains: search, mode: 'insensitive' } },
            { contactPerson: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    return prisma.customer.findMany({
      where,
      orderBy: { companyName: 'asc' },
      include: {
        _count: {
          select: {
            enquiries: true,
            quotations: true,
            salesOrders: true,
          },
        },
      },
    });
  }

  /**
   * Get single customer by ID with history
   */
  async getCustomerById(id) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        enquiries: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        salesOrders: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!customer) {
      throw ApiError.notFound(`Customer with ID '${id}' not found`);
    }

    return customer;
  }
}

module.exports = new CustomerService();
