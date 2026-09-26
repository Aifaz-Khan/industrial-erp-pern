const { z } = require('zod');

const quotationItemSchema = z.object({
  productId: z.string().uuid('Invalid Product ID format'),
  quantity: z.number().int().positive('Quantity must be an integer greater than 0'),
  unitPrice: z.number().nonnegative('Unit price must be a non-negative number'),
});

const createQuotationSchema = z.object({
  customerId: z.string().uuid('Invalid Customer ID format'),
  enquiryId: z
    .string()
    .uuid('Invalid Enquiry ID format')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  validUntil: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  discountPercentage: z
    .number()
    .min(0, 'Discount % cannot be less than 0')
    .max(100, 'Discount % cannot exceed 100')
    .default(0.0),
  taxPercentage: z
    .number()
    .min(0, 'Tax % cannot be less than 0')
    .max(100, 'Tax % cannot exceed 100')
    .default(18.0),
  notes: z.string().max(500, 'Notes too long').optional(),
  items: z.array(quotationItemSchema).min(1, 'Quotation must contain at least one product item'),
});

const updateQuotationStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'], {
    errorMap: () => ({ message: 'Status must be one of: DRAFT, SENT, ACCEPTED, REJECTED' }),
  }),
});

module.exports = {
  createQuotationSchema,
  updateQuotationStatusSchema,
};
