const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data in order of dependency
  await prisma.notification.deleteMany({});
  await prisma.healthReading.deleteMany({});
  await prisma.incident.deleteMany({});
  await prisma.ride.deleteMany({});
  await prisma.emergencyContact.deleteMany({});
  await prisma.helmet.deleteMany({});
  await prisma.analyticsSnapshot.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🧹 Cleaned existing database records.');

  // Create default passwords
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@helmet.com',
      phone: '+15550100',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Fleet Manager',
      email: 'manager@helmet.com',
      phone: '+15550200',
      passwordHash,
      role: 'FLEET_MANAGER',
    },
  });

  const rider = await prisma.user.create({
    data: {
      name: 'John Doe (Rider)',
      email: 'rider@helmet.com',
      phone: '+15550300',
      passwordHash,
      role: 'RIDER',
      firebaseUid: 'mock_firebase_uid_john_doe',
    },
  });

  console.log('👤 Created users: Admin, Fleet Manager, and Rider.');

  // 2. Create Helmets
  const helmet1 = await prisma.helmet.create({
    data: {
      serialNumber: 'SH-2026-X1',
      bleMacAddress: 'AA:BB:CC:DD:EE:FF',
      ownerId: rider.id,
      firmwareVersion: 'v1.0.4',
      batteryLevel: 85,
      pairingStatus: true,
      lastSeenAt: new Date(),
    },
  });

  const helmet2 = await prisma.helmet.create({
    data: {
      serialNumber: 'SH-2026-Y2',
      bleMacAddress: '11:22:33:44:55:66',
      firmwareVersion: 'v1.0.3',
      batteryLevel: 98,
      pairingStatus: false,
    },
  });

  console.log('🪖 Created helmets: paired with Rider, and unassigned.');

  // 3. Create Emergency Contacts
  const contact1 = await prisma.emergencyContact.create({
    data: {
      userId: rider.id,
      name: 'Jane Doe',
      phone: '+15550400',
      relationship: 'Spouse',
      priority: 1,
    },
  });

  const contact2 = await prisma.emergencyContact.create({
    data: {
      userId: rider.id,
      name: 'Robert Doe',
      phone: '+15550500',
      relationship: 'Father',
      priority: 2,
    },
  });

  console.log('📞 Created emergency contacts for Rider.');

  // 4. Create a Ride
  const startTime = new Date(Date.now() - 3600000); // 1 hour ago
  const endTime = new Date(Date.now() - 600000); // 10 minutes ago
  
  const ride = await prisma.ride.create({
    data: {
      userId: rider.id,
      helmetId: helmet1.id,
      startTime,
      endTime,
      startLocation: 'Point A (Downtown)',
      endLocation: 'Point B (Suburbs)',
      distance: 12.5, // 12.5 km
      avgSpeed: 25.0, // km/h
      maxSpeed: 45.0, // km/h
      status: 'COMPLETED',
      route: [
        { lat: 40.7128, lng: -74.006, timestamp: startTime.toISOString(), speed: 0, heartRate: 72 },
        { lat: 40.7135, lng: -74.005, timestamp: new Date(startTime.getTime() + 1200000).toISOString(), speed: 28, heartRate: 85 },
        { lat: 40.7150, lng: -74.002, timestamp: endTime.toISOString(), speed: 0, heartRate: 78 }
      ],
    },
  });

  console.log('🏍️ Created a completed ride for Rider.');

  // 5. Create Health Readings for the Ride
  await prisma.healthReading.createMany({
    data: [
      {
        rideId: ride.id,
        timestamp: new Date(startTime.getTime() + 300000), // 5 min in
        heartRate: 75,
        bloodPressure: '120/80',
        fatigueScore: 0.1,
      },
      {
        rideId: ride.id,
        timestamp: new Date(startTime.getTime() + 1500000), // 25 min in
        heartRate: 88,
        bloodPressure: '122/82',
        fatigueScore: 0.25,
      },
      {
        rideId: ride.id,
        timestamp: new Date(startTime.getTime() + 2700000), // 45 min in
        heartRate: 82,
        bloodPressure: '121/81',
        fatigueScore: 0.3,
      },
    ],
  });

  console.log('💓 Created health readings for the ride.');

  // 6. Create active ride for telemetry demonstration
  const activeRide = await prisma.ride.create({
    data: {
      userId: rider.id,
      helmetId: helmet1.id,
      startTime: new Date(),
      startLocation: 'Suburbs',
      status: 'ACTIVE',
    },
  });

  console.log('🏍️ Created an active ride for telemetry testing.');

  // 7. Create Incident
  const incident = await prisma.incident.create({
    data: {
      userId: rider.id,
      helmetId: helmet1.id,
      rideId: ride.id,
      type: 'CRASH',
      detectedAt: new Date(startTime.getTime() + 1800000), // 30 min in
      gpsLat: 40.7142,
      gpsLng: -74.004,
      confirmationStatus: 'AUTO_TRIGGERED',
      resolvedAt: endTime,
    },
  });

  console.log('🚨 Created a completed incident record.');

  // 8. Create Notification
  await prisma.notification.create({
    data: {
      userId: rider.id,
      incidentId: incident.id,
      type: 'CRASH',
      channel: 'BOTH',
      status: 'DELIVERED',
      sentAt: new Date(startTime.getTime() + 1805000),
    },
  });

  console.log('💬 Created a notification record.');

  // 9. Pre-fill Analytics Snapshot
  await prisma.analyticsSnapshot.create({
    data: {
      userId: rider.id,
      totalRides: 1,
      totalDistance: 12.5,
      averageSpeed: 25.0,
      averageHeartRate: 81.6,
      totalIncidents: 1,
    },
  });

  console.log('📊 Initialized Analytics Snapshot for Rider.');
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
