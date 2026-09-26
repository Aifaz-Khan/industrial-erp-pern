const customerService = require('../services/customerService');
const { createCustomerSchema } = require('../validators/customerValidator');
const ApiResponse = require('../utils/apiResponse');

class CustomerController {
  async create(req, res, next) {
    try {
      const validatedData = createCustomerSchema.parse(req.body);
      const customer = await customerService.createCustomer(validatedData);
      return ApiResponse.success(res, 201, 'Customer created successfully', { customer });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const search = req.query.search || '';
      const customers = await customerService.getAllCustomers(search);
      return ApiResponse.success(res, 200, 'Customers retrieved successfully', { customers });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const customer = await customerService.getCustomerById(req.params.id);
      return ApiResponse.success(res, 200, 'Customer details retrieved successfully', { customer });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CustomerController();
