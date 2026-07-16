const prisma = require('../config/prisma');
const catchAsync = require('../utils/catchAsync');
const formatResponse = require('../utils/formatResponse');
const helmetService = require('../services/helmet.service');
const ApiError = require('../utils/ApiError');

/**
 * Get ride and health analytics details for a specific user.
 */
const getRidesAnalytics = catchAsync(async (req, res) => {
  let { userId } = req.params;
  
  if (userId === 'me') {
    userId = req.user.id;
  }

  if (req.user.id !== userId) {
    throw new ApiError(403, 'Access denied. You can only view your own analytics.');
  }

  let snapshot = await prisma.analyticsSnapshot.findUnique({
    where: { userId },
  });

  if (!snapshot) {
    await helmetService.updateAnalyticsAsync(userId);
    snapshot = await prisma.analyticsSnapshot.findUnique({
      where: { userId },
    });
  }

  const recentRides = await prisma.ride.findMany({
    where: { userId, status: 'COMPLETED' },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      distance: true,
      avgSpeed: true,
      maxSpeed: true,
      healthReadings: {
        select: { heartRate: true, fatigueScore: true },
      },
    },
    take: 10,
    orderBy: { startTime: 'desc' },
  });

  const rideTrends = recentRides.map((ride) => {
    const readings = ride.healthReadings;
    const hrValues = readings.map((r) => r.heartRate);
    const avgHr = hrValues.length > 0 ? parseFloat((hrValues.reduce((s, h) => s + h, 0) / hrValues.length).toFixed(1)) : 0;

    const fatigueValues = readings.map((r) => r.fatigueScore).filter((f) => f !== null);
    const avgFatigue = fatigueValues.length > 0
      ? parseFloat((fatigueValues.reduce((s, f) => s + f, 0) / fatigueValues.length).toFixed(2))
      : 0;

    return {
      rideId: ride.id,
      date: ride.startTime,
      distance: ride.distance,
      avgSpeed: ride.avgSpeed,
      maxSpeed: ride.maxSpeed,
      averageHeartRate: avgHr,
      averageFatigue: avgFatigue,
    };
  });

  res.status(200).json(formatResponse(true, 'Rider analytics retrieved successfully.', {
    summary: snapshot,
    trends: rideTrends.reverse(),
  }));
});

/**
 * STUB: Future Fleet Dashboard Feature
 * Get aggregate global fleet monitoring statistics (Fleet Manager / Admin view)
 */
const getFleetAnalytics = catchAsync(async (req, res) => {
  const totalRiders = await prisma.user.count();
  const totalHelmets = await prisma.helmet.count();
  const activeHelmets = await prisma.helmet.count({ where: { pairingStatus: true } });

  const rideAggregate = await prisma.ride.aggregate({
    where: { status: 'COMPLETED' },
    _sum: { distance: true },
    _avg: { avgSpeed: true },
    _count: { id: true },
  });

  const totalDistance = rideAggregate._sum.distance || 0;
  const averageSpeed = rideAggregate._avg.avgSpeed || 0;
  const totalCompletedRides = rideAggregate._count.id || 0;

  const healthAggregate = await prisma.healthReading.aggregate({
    _avg: { heartRate: true, fatigueScore: true },
  });

  const averageHeartRate = healthAggregate._avg.heartRate || 0;
  const averageFatigue = healthAggregate._avg.fatigueScore || 0;

  const activeIncidents = await prisma.incident.count({
    where: { resolvedAt: null },
  });

  res.status(200).json(formatResponse(true, 'Fleet analytics retrieved successfully.', {
    totalRiders,
    totalHelmets,
    activeHelmets,
    totalCompletedRides,
    totalDistance: parseFloat(totalDistance.toFixed(2)),
    averageSpeed: parseFloat(averageSpeed.toFixed(2)),
    averageHeartRate: parseFloat(averageHeartRate.toFixed(1)),
    averageFatigue: parseFloat(averageFatigue.toFixed(2)),
    activeIncidents,
  }));
});

/**
 * STUB: Future Fleet Dashboard Feature
 * Get statistical summary of reported incidents
 */
const getIncidentsSummary = catchAsync(async (req, res) => {
  const totalIncidents = await prisma.incident.count();

  const typeCounts = await prisma.incident.groupBy({
    by: ['type'],
    _count: { id: true },
  });

  const statusCounts = await prisma.incident.groupBy({
    by: ['confirmationStatus'],
    _count: { id: true },
  });
  const resolvedCount = await prisma.incident.count({ where: { NOT: { resolvedAt: null } } });
  const unresolvedCount = await prisma.incident.count({ where: { resolvedAt: null } });

  const types = { CRASH: 0, MANUAL_SOS: 0, FALL: 0 };
  typeCounts.forEach((group) => {
    types[group.type] = group._count.id;
  });

  const statuses = { PENDING: 0, CONFIRMED: 0, CANCELLED: 0, AUTO_TRIGGERED: 0 };
  statusCounts.forEach((group) => {
    statuses[group.confirmationStatus] = group._count.id;
  });

  res.status(200).json(formatResponse(true, 'Incidents summary retrieved successfully.', {
    totalIncidents,
    types,
    statuses,
    resolution: {
      resolved: resolvedCount,
      unresolved: unresolvedCount,
    },
  }));
});

module.exports = {
  getRidesAnalytics,
  getFleetAnalytics,
  getIncidentsSummary,
};
