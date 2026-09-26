const { z } = require('zod');

const createCustomerSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, 'Company name must be at least 2 characters long')
    .max(100, 'Company name too long'),
  contactPerson: z
    .string()
    .trim()
    .min(2, 'Contact person must be at least 2 characters long')
    .max(100, 'Contact person too long'),
  mobile: z
    .string()
    .trim()
    .min(7, 'Mobile number must be at least 7 digits')
    .max(20, 'Mobile number too long'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address format'),
  city: z
    .string()
    .trim()
    .min(2, 'City must be at least 2 characters long')
    .max(60, 'City too long'),
});

module.exports = {
  createCustomerSchema,
};
