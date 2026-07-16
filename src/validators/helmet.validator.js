const { z } = require('zod');

const pair = z.object({
  body: z.object({
    serialNumber: z.string({ required_error: 'Serial number is required' }),
    bleMacAddress: z.string({ required_error: 'BLE MAC Address is required' }),
  }),
});

const telemetry = z.object({
  body: z.object({
    firmwareVersion: z.string().optional(),
    batteryLevel: z.coerce.number().min(0).max(100).optional(),
    activeRideId: z.string().uuid().optional(),
    // Array of backfilled telemetry for intermittent connectivity
    readings: z
      .array(
        z.object({
          timestamp: z.string().transform((val) => new Date(val)),
          heartRate: z.number().int().min(0).max(250),
          bloodPressure: z.string().optional(),
          fatigueScore: z.number().min(0).max(1).optional(),
          gpsLat: z.number().optional(),
          gpsLng: z.number().optional(),
          speed: z.number().min(0).optional(),
        })
      )
      .optional(),
  }),
});

module.exports = {
  pair,
  telemetry,
};
