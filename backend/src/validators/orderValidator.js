const { z } = require('zod');

const dispatchOrderSchema = z.object({
  vehicleNumber: z
    .string()
    .trim()
    .min(3, 'Vehicle number must be at least 3 characters')
    .max(30, 'Vehicle number too long'),
  driverName: z
    .string()
    .trim()
    .min(2, 'Driver name must be at least 2 characters')
    .max(100, 'Driver name too long'),
  notes: z.string().max(500, 'Notes too long').optional(),
});

module.exports = {
  dispatchOrderSchema,
};
