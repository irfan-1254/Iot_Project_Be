const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const sockets = require('../sockets/socket');

/**
 * Register a helmet and pair it with a user
 */
const pairHelmet = async (userId, serialNumber, bleMacAddress) => {
  // Check if helmet exists by serial number or MAC address
  let helmet = await prisma.helmet.findFirst({
    where: {
      OR: [{ serialNumber }, { bleMacAddress }],
    },
  });

  if (!helmet) {
    // If helmet doesn't exist, create it
    helmet = await prisma.helmet.create({
      data: {
        serialNumber,
        bleMacAddress,
        ownerId: userId,
        pairingStatus: true,
      },
    });
  } else {
    // If it exists but belongs to someone else, update owner
    helmet = await prisma.helmet.update({
      where: { id: helmet.id },
      data: {
        ownerId: userId,
        pairingStatus: true,
      },
    });
  }

  logger.info(`🪖 Helmet paired: ${serialNumber} with user: ${userId}`);
  return helmet;
};

/**
 * Unpair helmet from user
 */
const unpairHelmet = async (helmetId, userId) => {
  const helmet = await prisma.helmet.findFirst({
    where: { id: helmetId, ownerId: userId },
  });

  if (!helmet) {
    throw new ApiError(404, 'Helmet not found or not paired with this user.');
  }

  const updatedHelmet = await prisma.helmet.update({
    where: { id: helmetId },
    data: {
      ownerId: null,
      pairingStatus: false,
    },
  });

  logger.info(`🪖 Helmet unpaired: ${helmetId} from user: ${userId}`);
  return updatedHelmet;
};

/**
 * Get helmet information
 */
const getHelmetDetails = async (helmetId) => {
  const helmet = await prisma.helmet.findUnique({
    where: { id: helmetId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!helmet) {
    throw new ApiError(404, 'Helmet not found.');
  }

  return helmet;
};

/**
 * Ingest telemetry payload from the app. Handles batched/backfilled readings.
 */
const ingestTelemetry = async (helmetId, userId, telemetryData) => {
  const { batteryLevel, firmwareVersion, activeRideId, readings } = telemetryData;

  // 1. Update Helmet general fields
  const helmetUpdateData = {
    lastSeenAt: new Date(),
  };
  if (batteryLevel !== undefined) helmetUpdateData.batteryLevel = batteryLevel;
  if (firmwareVersion !== undefined) helmetUpdateData.firmwareVersion = firmwareVersion;

  const helmet = await prisma.helmet.update({
    where: { id: helmetId },
    data: helmetUpdateData,
  });

  // 2. Process readings if available
  if (readings && readings.length > 0 && activeRideId) {
    // Verify ride exists and belongs to the user
    const ride = await prisma.ride.findFirst({
      where: { id: activeRideId, userId },
    });

    if (!ride) {
      throw new ApiError(404, 'Active ride not found or not associated with this user.');
    }

    // Insert health readings in bulk
    const healthReadingsToCreate = readings.map((r) => ({
      rideId: activeRideId,
      timestamp: r.timestamp,
      heartRate: r.heartRate,
      bloodPressure: r.bloodPressure || null,
      fatigueScore: r.fatigueScore !== undefined ? r.fatigueScore : null,
    }));

    await prisma.healthReading.createMany({
      data: healthReadingsToCreate,
    });

    // Update ride route coordinate tracking and speed metrics
    const currentRoute = Array.isArray(ride.route) ? ride.route : [];
    
    // Format new GPS/speed points to append to the route JSON array
    const newRoutePoints = readings
      .filter((r) => r.gpsLat !== undefined && r.gpsLng !== undefined)
      .map((r) => ({
        lat: r.gpsLat,
        lng: r.gpsLng,
        timestamp: r.timestamp.toISOString(),
        speed: r.speed || 0,
        heartRate: r.heartRate,
      }));

    if (newRoutePoints.length > 0) {
      const updatedRoute = [...currentRoute, ...newRoutePoints];
      
      // Calculate updated speed metrics
      const speeds = updatedRoute.map((p) => p.speed).filter((s) => s > 0);
      const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : ride.maxSpeed;
      const avgSpeed = speeds.length > 0 
        ? parseFloat((speeds.reduce((sum, s) => sum + s, 0) / speeds.length).toFixed(2)) 
        : ride.avgSpeed;

      // Update the Ride object
      await prisma.ride.update({
        where: { id: activeRideId },
        data: {
          route: updatedRoute,
          maxSpeed,
          avgSpeed,
        },
      });
    }

    // 3. Emit real-time telemetry updates to Socket.IO clients in this user's room
    // Send the latest reading from the batch
    const latestReading = readings[readings.length - 1];
    sockets.emitTelemetry(userId, {
      helmetId,
      batteryLevel: helmet.batteryLevel,
      lastSeenAt: helmet.lastSeenAt,
      timestamp: latestReading.timestamp,
      heartRate: latestReading.heartRate,
      bloodPressure: latestReading.bloodPressure,
      fatigueScore: latestReading.fatigueScore,
      gpsLat: latestReading.gpsLat,
      gpsLng: latestReading.gpsLng,
      speed: latestReading.speed,
    });

    // 4. Update Analytics snapshot async to optimize performance
    updateAnalyticsAsync(userId);
  }

  return { success: true, helmet };
};

/**
 * Compute and update the user's AnalyticsSnapshot
 * @param {string} userId 
 */
const updateAnalyticsAsync = async (userId) => {
  try {
    // Get all completed rides for the user
    const completedRides = await prisma.ride.findMany({
      where: { userId, status: 'COMPLETED' },
      include: {
        healthReadings: {
          select: { heartRate: true },
        },
      },
    });

    // Get total incidents count
    const totalIncidents = await prisma.incident.count({
      where: { userId },
    });

    const totalRides = completedRides.length;
    let totalDistance = 0;
    let totalSpeedSum = 0;
    let validSpeedCount = 0;
    let heartRateSum = 0;
    let heartRateCount = 0;

    completedRides.forEach((ride) => {
      totalDistance += ride.distance;
      if (ride.avgSpeed > 0) {
        totalSpeedSum += ride.avgSpeed;
        validSpeedCount++;
      }
      ride.healthReadings.forEach((reading) => {
        heartRateSum += reading.heartRate;
        heartRateCount++;
      });
    });

    const averageSpeed = validSpeedCount > 0 ? parseFloat((totalSpeedSum / validSpeedCount).toFixed(2)) : 0;
    const averageHeartRate = heartRateCount > 0 ? parseFloat((heartRateSum / heartRateCount).toFixed(2)) : 0;

    await prisma.analyticsSnapshot.upsert({
      where: { userId },
      update: {
        totalRides,
        totalDistance,
        averageSpeed,
        averageHeartRate,
        totalIncidents,
      },
      create: {
        userId,
        totalRides,
        totalDistance,
        averageSpeed,
        averageHeartRate,
        totalIncidents,
      },
    });
  } catch (error) {
    logger.error(`Error updating analytics snapshot for user ${userId}: %o`, error);
  }
};

module.exports = {
  pairHelmet,
  unpairHelmet,
  getHelmetDetails,
  ingestTelemetry,
  updateAnalyticsAsync,
};
