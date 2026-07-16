const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const notificationService = require('./notification.service');
const { CONFIRMATION_STATUS, INCIDENT_TYPES } = require('../utils/constants');

// In-memory registry to hold active countdown timers for crash confirmations
const activeTimers = new Map();

// Countdown window in milliseconds (e.g. 15 seconds confirmation countdown)
const CONFIRMATION_WINDOW_MS = 15000;

/**
 * Register a new incident (Crash detection or manual SOS)
 */
const createIncident = async (userId, incidentData) => {
  const { type, gpsLat, gpsLng, detectedAt, rideId } = incidentData;

  // Find user's paired helmet to link to incident automatically
  const userHelmet = await prisma.helmet.findFirst({
    where: { ownerId: userId, pairingStatus: true },
  });

  const helmetId = userHelmet ? userHelmet.id : null;

  // Determine initial status based on type
  // Manual SOS triggers immediately. Crash/Fall triggers are PENDING countdown
  const isManual = type === INCIDENT_TYPES.MANUAL_SOS;
  const initialStatus = isManual ? CONFIRMATION_STATUS.CONFIRMED : CONFIRMATION_STATUS.PENDING;

  // Prevent duplicate crash alerts in the last 30 seconds (idempotency check)
  const timeLimit = new Date(Date.now() - 30000);
  const recentIncident = await prisma.incident.findFirst({
    where: {
      userId,
      type,
      detectedAt: { gte: timeLimit },
    },
  });

  if (recentIncident) {
    logger.warn(`[Incident Service] Duplicate incident prevention for user ${userId}. Returning recent incident.`);
    return recentIncident;
  }

  // Create incident record
  const incident = await prisma.incident.create({
    data: {
      userId,
      helmetId,
      rideId: rideId || null,
      type,
      gpsLat,
      gpsLng,
      detectedAt: detectedAt || new Date(),
      confirmationStatus: initialStatus,
    },
  });

  logger.info(`🚨 Incident logged: ID=${incident.id}, Type=${type}, Status=${initialStatus}`);

  if (isManual) {
    // Dispatch alerts immediately for manual SOS
    // Runs in background to not block response
    notificationService.sendEmergencyAlerts(incident.id);
  } else {
    // Start countdown timer for crash/fall alerts
    const timerId = setTimeout(async () => {
      try {
        // Double check status before auto-triggering
        const currentIncident = await prisma.incident.findUnique({
          where: { id: incident.id },
        });

        if (currentIncident && currentIncident.confirmationStatus === CONFIRMATION_STATUS.PENDING) {
          logger.info(`⏰ Countdown elapsed for Incident ${incident.id}. Auto-triggering alerts.`);
          
          await prisma.incident.update({
            where: { id: incident.id },
            data: { confirmationStatus: CONFIRMATION_STATUS.AUTO_TRIGGERED },
          });

          // Dispatch alerts
          await notificationService.sendEmergencyAlerts(incident.id);
        }
      } catch (err) {
        logger.error(`Error in incident countdown timer: %o`, err);
      } finally {
        activeTimers.delete(incident.id);
      }
    }, CONFIRMATION_WINDOW_MS);

    // Save timer reference in-memory
    activeTimers.set(incident.id, timerId);
  }

  return incident;
};

/**
 * Handle rider confirming or cancelling the incident within the countdown window
 */
const confirmOrCancelIncident = async (userId, incidentId, status) => {
  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, userId },
  });

  if (!incident) {
    throw new ApiError(404, 'Incident not found.');
  }

  if (incident.confirmationStatus !== CONFIRMATION_STATUS.PENDING) {
    throw new ApiError(400, `Incident has already been processed (Current status: ${incident.confirmationStatus}).`);
  }

  // Clear countdown timer if registered
  if (activeTimers.has(incidentId)) {
    clearTimeout(activeTimers.get(incidentId));
    activeTimers.delete(incidentId);
    logger.info(`⏰ Cleared countdown timer for Incident ${incidentId}`);
  }

  // Update status
  const updatedIncident = await prisma.incident.update({
    where: { id: incidentId },
    data: { confirmationStatus: status },
  });

  logger.info(`🚨 Incident ${incidentId} updated by user to status: ${status}`);

  // If rider confirmed, trigger notification alerts immediately
  if (status === CONFIRMATION_STATUS.CONFIRMED) {
    notificationService.sendEmergencyAlerts(incidentId);
  }

  return updatedIncident;
};

/**
 * Resolve an incident (Fleet manager / Admin mark incident as resolved)
 */
const resolveIncident = async (incidentId) => {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
  });

  if (!incident) {
    throw new ApiError(404, 'Incident not found.');
  }

  return await prisma.incident.update({
    where: { id: incidentId },
    data: {
      resolvedAt: new Date(),
    },
  });
};

/**
 * Get incident logs with filtering options
 */
const listIncidents = async (query = {}) => {
  const { userId, type, confirmationStatus, limit = 50, page = 1 } = query;
  const skip = (page - 1) * limit;

  const where = {};
  if (userId) where.userId = userId;
  if (type) where.type = type;
  if (confirmationStatus) where.confirmationStatus = confirmationStatus;

  const [incidents, total] = await prisma.$transaction([
    prisma.incident.findMany({
      where,
      include: {
        user: {
          select: { name: true, phone: true, email: true },
        },
      },
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { detectedAt: 'desc' },
    }),
    prisma.incident.count({ where }),
  ]);

  return {
    incidents,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  createIncident,
  confirmOrCancelIncident,
  resolveIncident,
  listIncidents,
};
