const { z } = require('zod');
const { INCIDENT_TYPES, CONFIRMATION_STATUS } = require('../utils/constants');

const createIncident = z.object({
  body: z.object({
    type: z.nativeEnum(INCIDENT_TYPES).default(INCIDENT_TYPES.CRASH),
    gpsLat: z.number({ required_error: 'GPS Latitude is required' }),
    gpsLng: z.number({ required_error: 'GPS Longitude is required' }),
    detectedAt: z.string().optional().transform((val) => val ? new Date(val) : new Date()),
    rideId: z.string().uuid().optional(),
  }),
});

const confirmIncident = z.object({
  body: z.object({
    status: z.enum([CONFIRMATION_STATUS.CONFIRMED, CONFIRMATION_STATUS.CANCELLED], {
      required_error: 'Confirmation status must be either CONFIRMED or CANCELLED',
    }),
  }),
});

module.exports = {
  createIncident,
  confirmIncident,
};
