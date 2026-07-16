const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;
let isMailMocked = true;

const initializeMailService = () => {
  if (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS) {
    try {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465, // true for 465, false for other ports
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
      isMailMocked = false;
      // logger.info('📧 Nodemailer transporter initialized successfully.');
    } catch (error) {
      logger.error('❌ Failed to initialize Nodemailer transporter: %o', error);
      logger.warn('⚠️ Falling back to Mail Mock mode.');
    }
  } else {
    logger.warn('⚠️ SMTP credentials are not fully configured in .env. Running in Mail Mock mode.');
  }
};

initializeMailService();

/**
 * Send an email using Nodemailer or mock dispatch
 * @param {string} to - Destination email address
 * @param {string} subject - Email subject
 * @param {string} text - Email body (plain text)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendEmail = async (to, subject, text) => {
  if (!to) {
    logger.error('❌ Missing recipient email address');
    return { success: false, error: 'Missing recipient email address' };
  }

  if (isMailMocked) {
    logger.info(`[Mail Service] Mock Send Email to [${to}]: Subject="${subject}", Body="${text}"`);
    return { success: true, messageId: `mock_email_id_${Date.now()}` };
  }

  try {
    const info = await transporter.sendMail({
      from: env.MAIL_FROM || 'noreply@smarthelmet.com',
      to,
      subject,
      text,
    });
    
    logger.info(`Successfully sent Email to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`Error sending Email to ${to}: %o`, error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  isMailMocked
};
