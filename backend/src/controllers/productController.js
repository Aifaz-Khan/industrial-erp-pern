const productService = require('../services/productService');
const ApiResponse = require('../utils/apiResponse');

class ProductController {
  async getAll(req, res, next) {
    try {
      const products = await productService.getAllProducts();
      return ApiResponse.success(res, 200, 'Products retrieved successfully', { products });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const product = await productService.getProductById(req.params.id);
      return ApiResponse.success(res, 200, 'Product details retrieved successfully', { product });
    } catch (error) {
      next(error);
    }
  }

  async getInventory(req, res, next) {
    try {
      const inventory = await productService.getInventoryOverview();
      return ApiResponse.success(res, 200, 'Inventory overview retrieved successfully', { inventory });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
