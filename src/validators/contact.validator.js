const { z } = require('zod');

const createContact = z.object({
  body: z.object({
    name: z.string({ required_error: 'Contact name is required' }).min(2),
    phone: z.string({ required_error: 'Phone number is required' }),
    relationship: z.string({ required_error: 'Relationship is required' }),
    priority: z.coerce.number().int().min(1).default(1),
  }),
});

const updateContact = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    relationship: z.string().optional(),
    priority: z.coerce.number().int().min(1).optional(),
  }),
});

module.exports = {
  createContact,
  updateContact,
};
