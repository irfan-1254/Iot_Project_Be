const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const env = require('../config/env');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Next-Gen Smart Helmet Backend API',
    version: '1.0.0',
    description: 'Production-ready REST and Real-Time backend API documentation for motorcyclist safety telemetry, ride history, and automated SOS incident notifications.',
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}`,
      description: 'Development Local Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token in the format: Bearer <token>',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../controllers/*.js'),
  ],
};

const swaggerSpec = swaggerJSDoc(options);

const serveSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  loggerInfo = require('../utils/logger');
};

module.exports = serveSwagger;
