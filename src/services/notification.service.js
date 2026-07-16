const prisma = require('../config/prisma');
const firebaseService = require('./firebase.service');
const mailService = require('./mail.service');
const logger = require('../utils/logger');
const { NOTIFICATION_TYPES, NOTIFICATION_CHANNELS, NOTIFICATION_STATUS } = require('../utils/constants');

/**
 * Get notification history logs for a user
 * @param {string} userId 
 */
const getUserNotifications = async (userId) => {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Fan out FCM push notification and fallback Email to all emergency contacts of the rider for an active incident.
 * @param {string} incidentId 
 */
const sendEmergencyAlerts = async (incidentId) => {
  try {
    // 1. Fetch incident along with rider (user) information
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        user: {
          include: {
            emergencyContacts: true,
          },
        },
      },
    });

    if (!incident) {
      logger.error(`[Notification Service] Incident ${incidentId} not found.`);
      return;
    }

    const riderName = incident.user.name;
    const gpsLink = `https://maps.google.com/maps?q=${incident.gpsLat},${incident.gpsLng}`;
    const typeLabel = incident.type === 'CRASH' ? 'potential CRASH' : 'MANUAL SOS';
    
    const messageText = `EMERGENCY ALERT: Rider ${riderName} has triggered a ${typeLabel}. Live GPS location: ${gpsLink}`;

    logger.info(`[Notification Service] Dispatching emergency alerts for Incident ID: ${incidentId}. Message: "${messageText}"`);

    const contacts = incident.user.emergencyContacts;

    if (!contacts || contacts.length === 0) {
      logger.warn(`[Notification Service] No emergency contacts configured for user ${incident.userId}. Alert was not sent.`);
      return;
    }

    // 2. Loop through all emergency contacts and send alerts
    for (const contact of contacts) {
      let isPushSent = false;
      let isMailSent = false;

      // Check if emergency contact user has a Firebase UID to attempt a Push Notification
      // Note: In a full system, we might maintain device registration tokens for users. 
      // If we don't have device token for this contact, we fall back directly to Email.
      const contactUser = await prisma.user.findFirst({
        where: { phone: contact.phone },
      });

      // A) Try Push notification (placeholder for client token, can be synced via app later)
      // For this implementation, we will log/stub push notification dispatch.
      if (contactUser && contactUser.firebaseUid) {
        try {
          // If we had a device token mapped, we would use it here.
          // Let's call FCM push messaging (using a placeholder token for demonstration or Firebase UID)
          const pushResult = await firebaseService.sendPushNotification(
            `device_token_of_${contactUser.id}`,
            `Emergency: ${riderName}`,
            `A ${typeLabel} was detected. View live GPS.`,
            { incidentId: incident.id, lat: String(incident.gpsLat), lng: String(incident.gpsLng) }
          );
          isPushSent = pushResult.success;
        } catch (pushErr) {
          logger.error(`[Notification Service] FCM push failed for contact ${contact.name}: %o`, pushErr);
        }
      }

      // B) Send Fallback Email (Nodemailer)
      if (contact.email) {
        try {
          const mailResult = await mailService.sendEmail(contact.email, `Emergency Alert: ${riderName}`, messageText);
          isMailSent = mailResult.success;
        } catch (mailErr) {
          logger.error(`[Notification Service] Email dispatch failed for contact ${contact.name}: %o`, mailErr);
        }
      } else {
        logger.warn(`[Notification Service] Contact ${contact.name} has no email address. Skipping email alert.`);
      }

      // Determine final channel and status
      let finalChannel = NOTIFICATION_CHANNELS.EMAIL;
      if (isPushSent && isMailSent) finalChannel = NOTIFICATION_CHANNELS.BOTH;
      else if (isPushSent) finalChannel = NOTIFICATION_CHANNELS.PUSH;

      const finalStatus = (isPushSent || isMailSent) ? NOTIFICATION_STATUS.DELIVERED : NOTIFICATION_STATUS.FAILED;

      // C) Create Notification log in database
      await prisma.notification.create({
        data: {
          userId: incident.userId,
          incidentId: incident.id,
          type: incident.type === 'CRASH' ? NOTIFICATION_TYPES.CRASH : NOTIFICATION_TYPES.SOS,
          channel: finalChannel,
          status: finalStatus,
          sentAt: new Date(),
        },
      });

      logger.info(`[Notification Service] Dispatched alert to ${contact.name} (${contact.phone}). Status: ${finalStatus}`);
    }
  } catch (error) {
    logger.error(`[Notification Service] Fatal crash in sendEmergencyAlerts for Incident ${incidentId}: %o`, error);
  }
};

module.exports = {
  getUserNotifications,
  sendEmergencyAlerts,
};
