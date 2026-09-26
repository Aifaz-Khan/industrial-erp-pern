const { z } = require('zod');

const enquiryItemSchema = z.object({
  productId: z.string().uuid('Invalid Product ID format'),
  quantity: z.number().int().positive('Quantity must be an integer greater than 0'),
  targetPrice: z.number().nonnegative('Target price must be a non-negative number').optional(),
});

const createEnquirySchema = z.object({
  customerId: z.string().uuid('Invalid Customer ID format'),
  requiredDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
  items: z.array(enquiryItemSchema).min(1, 'Enquiry must contain at least one product item'),
});

const updateEnquiryStatusSchema = z.object({
  status: z.enum(['NEW', 'QUOTED', 'WON', 'LOST'], {
    errorMap: () => ({ message: 'Status must be one of: NEW, QUOTED, WON, LOST' }),
  }),
});

module.exports = {
  createEnquirySchema,
  updateEnquiryStatusSchema,
};
