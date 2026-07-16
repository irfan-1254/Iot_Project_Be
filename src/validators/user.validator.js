const { z } = require('zod');

const updateMe = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().min(8, 'Invalid phone number format').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  }),
});

module.exports = {
  updateMe,
};
