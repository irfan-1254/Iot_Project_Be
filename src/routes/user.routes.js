const express = require('express');
const userController = require('../controllers/user.controller');
const userValidator = require('../validators/user.validator');
const validate = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/me', authenticate, userController.getMe);
router.patch('/me', authenticate, validate(userValidator.updateMe), userController.updateMe);
router.delete('/me', authenticate, userController.deleteMe);

module.exports = router;
