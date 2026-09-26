const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');

class ProductService {
  /**
   * Retrieve all products with their active prices and categories
   */
  async getAllProducts() {
    return prisma.product.findMany({
      orderBy: { productCode: 'asc' },
      include: {
        inventory: {
          select: {
            physicalQuantity: true,
            reservedQuantity: true,
          },
        },
      },
    });
  }

  /**
   * Retrieve single product by ID
   */
  async getProductById(id) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        inventory: true,
      },
    });

    if (!product) {
      throw ApiError.notFound(`Product with ID '${id}' not found`);
    }

    const availableQuantity = product.inventory
      ? product.inventory.physicalQuantity - product.inventory.reservedQuantity
      : 0;

    return {
      ...product,
      inventory: product.inventory
        ? {
            ...product.inventory,
            availableQuantity,
          }
        : null,
    };
  }

  /**
   * Get complete inventory overview with calculated available quantities
   * Formula: Available = Physical - Reserved
   */
  async getInventoryOverview() {
    const records = await prisma.inventory.findMany({
      include: {
        product: {
          select: {
            id: true,
            productCode: true,
            productName: true,
            category: true,
            unit: true,
            basePrice: true,
          },
        },
      },
      orderBy: {
        product: {
          productCode: 'asc',
        },
      },
    });

    return records.map((inv) => {
      const availableQuantity = inv.physicalQuantity - inv.reservedQuantity;
      return {
        id: inv.id,
        productId: inv.productId,
        productCode: inv.product.productCode,
        productName: inv.product.productName,
        category: inv.product.category,
        unit: inv.product.unit,
        basePrice: inv.product.basePrice,
        physicalQuantity: inv.physicalQuantity,
        reservedQuantity: inv.reservedQuantity,
        availableQuantity,
        updatedAt: inv.updatedAt,
      };
    });
  }
}

module.exports = new ProductService();
