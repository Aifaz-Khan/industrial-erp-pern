const enquiryService = require('../services/enquiryService');
const {
  createEnquirySchema,
  updateEnquiryStatusSchema,
} = require('../validators/enquiryValidator');
const ApiResponse = require('../utils/apiResponse');

class EnquiryController {
  async create(req, res, next) {
    try {
      const validatedData = createEnquirySchema.parse(req.body);
      const enquiry = await enquiryService.createEnquiry(req.user.id, validatedData);
      return ApiResponse.success(res, 201, 'Enquiry created successfully', { enquiry });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const status = req.query.status || null;
      const enquiries = await enquiryService.getAllEnquiries(status);
      return ApiResponse.success(res, 200, 'Enquiries retrieved successfully', { enquiries });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const enquiry = await enquiryService.getEnquiryById(req.params.id);
      return ApiResponse.success(res, 200, 'Enquiry details retrieved successfully', { enquiry });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { status } = updateEnquiryStatusSchema.parse(req.body);
      const enquiry = await enquiryService.updateEnquiryStatus(req.params.id, status);
      return ApiResponse.success(res, 200, `Enquiry status updated to '${status}'`, { enquiry });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EnquiryController();
