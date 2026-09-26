const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

module.exports = {
  loginSchema,
};
