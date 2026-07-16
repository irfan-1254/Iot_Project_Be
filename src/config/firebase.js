const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const path = require('path');
const fs = require('fs');
const env = require('./env');
const logger = require('../utils/logger');

let firebaseApp = null;
let isFirebaseMocked = false;

const initializeFirebase = () => {
  if (getApps().length > 0) {
    return getApp();
  }

  const serviceAccountPath = env.FIREBASE_SERVICE_ACCOUNT_PATH;
  
  if (!serviceAccountPath) {
    logger.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_PATH is not configured in .env. Running in Mock mode.');
    isFirebaseMocked = true;
    return null;
  }

  const absolutePath = path.isAbsolute(serviceAccountPath)
    ? serviceAccountPath
    : path.join(process.cwd(), serviceAccountPath);

  if (!fs.existsSync(absolutePath)) {
    logger.warn(`⚠️ Firebase credentials file not found at: ${absolutePath}. Running in Mock mode.`);
    isFirebaseMocked = true;
    return null;
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
    });
    return firebaseApp;
  } catch (error) {
    logger.error('❌ Failed to initialize Firebase Admin SDK from file: %o', error);
    isFirebaseMocked = true;
    return null;
  }
};

firebaseApp = initializeFirebase();

module.exports = {
  firebaseApp,
  isFirebaseMocked,
};
