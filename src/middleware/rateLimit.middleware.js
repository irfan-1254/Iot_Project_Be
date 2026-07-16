const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

// Generic API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  handler: (req, res, next) => {
    next(new ApiError(429, 'Too many requests from this IP, please try again after 15 minutes.'));
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Authentication Rate Limiter (Register, Login, Refresh)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, 
  handler: (req, res, next) => {
    next(new ApiError(429, 'Too many login attempts, please try again after 15 minutes.'));
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Emergency Incident SOS Limiter to avoid duplicate rapid alerts (anti-abuse)
const sosLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, 
  handler: (req, res, next) => {
    next(new ApiError(429, 'Too many emergency requests. Please wait a moment before sending again.'));
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  sosLimiter,
};
