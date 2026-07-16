const express = require('express');
const contactController = require('../controllers/contact.controller');
const contactValidator = require('../validators/contact.validator');
const validate = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate); 

router.get('/', contactController.getContacts);
router.post('/', validate(contactValidator.createContact), contactController.createContact);
router.patch('/:id', validate(contactValidator.updateContact), contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

module.exports = router;
