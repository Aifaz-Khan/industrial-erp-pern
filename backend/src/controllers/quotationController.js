const quotationService = require('../services/quotationService');
const {
  createQuotationSchema,
  updateQuotationStatusSchema,
} = require('../validators/quotationValidator');
const ApiResponse = require('../utils/apiResponse');

class QuotationController {
  async create(req, res, next) {
    try {
      const validatedData = createQuotationSchema.parse(req.body);
      const quotation = await quotationService.createQuotation(req.user.id, validatedData);
      return ApiResponse.success(res, 201, 'Quotation created successfully', { quotation });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const status = req.query.status || null;
      const quotations = await quotationService.getAllQuotations(status);
      return ApiResponse.success(res, 200, 'Quotations retrieved successfully', { quotations });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const quotation = await quotationService.getQuotationById(req.params.id);
      return ApiResponse.success(res, 200, 'Quotation details retrieved successfully', { quotation });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { status } = updateQuotationStatusSchema.parse(req.body);
      const quotation = await quotationService.updateQuotationStatus(req.params.id, status);
      return ApiResponse.success(res, 200, `Quotation status updated to '${status}'`, { quotation });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new QuotationController();
