const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./index'); // To get the port for server URL

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Ledger API',
      version: '1.0.0',
      description: 'API documentation for the Smart Ledger backend service, managing financial accounts and transactions.',
    },
    servers: [
      {
        url: `http://localhost:${config.port || 3000}/api`, // Base URL for API
        description: 'Development server',
      },
    ],
    // Optional: Define components like securitySchemes if you add auth later
    // components: {
    //   securitySchemes: {
    //     bearerAuth: {
    //       type: 'http',
    //       scheme: 'bearer',
    //       bearerFormat: 'JWT',
    //     }
    //   }
    // },
    // security: [{ // Global security definition (if any)
    //   bearerAuth: []
    // }]
  },
  // Path to the API docs (your route files)
  // We'll target all .js files within the routes directory and its subdirectories
  apis: ['./src/server/routes/**/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
