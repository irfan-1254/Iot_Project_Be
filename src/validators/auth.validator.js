const { z } = require('zod');

const register = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }).min(2, 'Name must be at least 2 characters'),
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
    phone: z.string({ required_error: 'Phone number is required' }).min(8, 'Invalid phone number format'),
    password: z.string({ required_error: 'Password is required' }).min(6, 'Password must be at least 6 characters'),
  }),
});

const login = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
    password: z.string({ required_error: 'Password is required' }),
  }),
});

const refresh = z.object({
  body: z.object({
    refreshToken: z.string({ required_error: 'Refresh token is required' }),
  }),
});

const firebaseSync = z.object({
  body: z.object({
    firebaseToken: z.string({ required_error: 'Firebase ID Token is required' }),
  }),
});

const verifyEmail = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
    otp: z.string({ required_error: 'OTP is required' }).length(6, 'OTP must be exactly 6 digits'),
  }),
});

const resendOtp = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
  }),
});

module.exports = {
  register,
  login,
  refresh,
  firebaseSync,
  verifyEmail,
  resendOtp,
};
