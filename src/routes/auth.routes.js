const express = require('express');
const authController = require('../controllers/auth.controller');
const authValidator = require('../validators/auth.validator');
const validate = require('../middleware/validation.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', validate(authValidator.register), authController.register);
router.post('/login', authLimiter, validate(authValidator.login), authController.login);
router.post('/verify-email', validate(authValidator.verifyEmail), authController.verifyEmail);
router.post('/resend-otp', authLimiter, validate(authValidator.resendOtp), authController.resendOtp);
router.post('/refresh', validate(authValidator.refresh), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/firebase-sync', authenticate, validate(authValidator.firebaseSync), authController.firebaseSync);

module.exports = router;
