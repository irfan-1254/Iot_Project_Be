# Next-Gen Smart Helmet Backend System

This is the production-grade, REST and WebSocket backend application for the **Next-Gen Smart Helmet System**. It handles user/rider authentication, emergency contacts database management, smart helmet Bluetooth pairing logs, real-time sensor telemetry ingestion, ride history stats, and safety-critical automatic SOS crash-alerting flows.

---

## Technical Stack

- **Runtime**: Node.js & Express
- **Database**: PostgreSQL (via Prisma ORM)
- **Real-Time Communication**: Socket.IO for pushing live rider telemetry
- **Safety Messaging**: Firebase Cloud Messaging (FCM) & Twilio SMS API fallbacks
- **Data Validation**: Zod Schema validation
- **Documentation**: Swagger OpenAPI docs (interactive UI)
- **Security**: helmet.js, cors, rate limiting, and bcrypt hashing

---

## Directory Layout

```
backend/
├── prisma/
│   ├── schema.prisma   # PostgreSQL Prisma Schema models
│   └── seed.js         # Dummy Database seeding script
├── src/
│   ├── app.js          # Express app configurations
│   ├── server.js       # HTTP server boot entry file
│   ├── config/         # Prisma client, firebase, and env vars validation
│   ├── controllers/    # API Request and Response mapping handlers
│   ├── services/       # Core business & utility logic (auth, helmet, SMS, FCM)
│   ├── routes/         # Router mounts per entity path namespaces
│   ├── middleware/     # JWT authentication, errors, upload & rate-limit guards
│   ├── validators/     # Zod payload structures
│   ├── utils/          # Standard response structures & Winston logs
│   ├── sockets/        # Socket.IO event handler for telemetry rooms
│   └── docs/           # Swagger documentation engine
└── uploads/            # Multipart profile/media uploads directory
```

---

## Getting Started

### 1. Installation

Change directory into the `backend/` folder and install dependencies:

```bash
cd backend
npm install
```

### 2. Environment Variables Setup

Create a `.env` file in the root of the `backend/` directory (you can copy the provided `.env.example` as a template):

```bash
cp .env.example .env
```

Ensure the variables are configured:
- `DATABASE_URL`: A valid PostgreSQL connection string.
- `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`: Secure secret keys for token signing.
- `FIREBASE_SERVICE_ACCOUNT_PATH`: Optional path to Firebase service account JSON. If left empty, Firebase operations (auth verification & FCM push alerts) automatically fallback to mock/local logging.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`: Optional credentials for Twilio SMS. If omitted, SMS operations run in safe mock/logging mode.

### 3. Database Migration and Seeding

To run migrations and apply the schema models to your PostgreSQL instance, run:

```bash
npx prisma migrate dev --name init
```

To seed the database with test riders, helmets, contacts, and historical rides, run:

```bash
npm run db:seed
```

### 4. Running the Server

Start the server in development mode with hot-reloading:

```bash
npm run dev
```

The server will initialize on port `5000` (by default) and output logs confirming status:

```text
🚀 Smart Helmet backend server listening on port 5000 [ENV: development]
📖 Swagger documentation available at http://localhost:5000/api-docs
```

---

## Core Safety Ingestion Flow (Incidents / SOS)

1. **Telemetry Batching**: Telemetry packets containing GPS, speed, heartRate, fatigue, and battery can be backfilled inside the `readings` list parameter under `PATCH /api/helmets/:id/telemetry`. This guarantees zero-loss of rider data during intermittent network disconnects on mountainous highways.
2. **Crash/Incident Trigger**:
   - When a potential `CRASH` is reported via `POST /api/incidents`, the backend records it as `PENDING` and spawns a **15-second countdown timer**.
   - If the rider cancels the event (false alarm) via `PATCH /api/incidents/:id/confirm` with status `CANCELLED`, the timer is destroyed and no alerts are dispatched.
   - If the countdown elapses or the user explicitly clicks `CONFIRMED` (or triggers a `MANUAL_SOS`), the status transitions and the notification service immediately fans out alerts (FCM Push & Twilio SMS with Google Maps live GPS link) to all priority-ordered emergency contacts.
