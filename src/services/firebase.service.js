const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');
const { firebaseApp, isFirebaseMocked } = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * Verify Firebase ID Token (used to authenticate/verify Firebase UID from client)
 * @param {string} token - Firebase ID token
 * @returns {Promise<string>} Firebase UID
 */
const verifyIdToken = async (token) => {
  if (isFirebaseMocked) {
    logger.info(`[Firebase Service] Mock verification of token: "${token.substring(0, 15)}..."`);
    // Fallback: If mock mode, return a deterministic mock UID derived from token
    if (token.startsWith('mock_')) {
      return token.replace('mock_', '');
    }
    return `mock_uid_${Buffer.from(token).toString('base64').substring(0, 10)}`;
  }

  try {
    const auth = getAuth(firebaseApp);
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    logger.error('Firebase token verification failed: %o', error);
    throw new Error('Invalid Firebase ID Token');
  }
};

/**
 * Send push notification via FCM
 * @param {string} registrationToken - Target device FCM registration token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} [data={}] - Key-value pair data payload
 */
const sendPushNotification = async (registrationToken, title, body, data = {}) => {
  if (isFirebaseMocked) {
    logger.info(
      `[Firebase Service] Mock Send Push Notification to [Token: ${registrationToken.substring(
        0,
        15
      )}...]: Title="${title}", Body="${body}", Data=%o`,
      data
    );
    return { success: true, messageId: `mock_msg_id_${Date.now()}` };
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data,
      token: registrationToken,
    };

    const messaging = getMessaging(firebaseApp);
    const response = await messaging.send(message);
    logger.info(`Successfully sent FCM message: ${response}`);
    return { success: true, messageId: response };
  } catch (error) {
    logger.error('Error sending FCM push notification: %o', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  verifyIdToken,
  sendPushNotification,
};
