import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'UpdatePilot REST API',
      version: '1.0.0',
      description: 'API documentation for UpdatePilot Software Update Intelligence & Management Platform',
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        AgentAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-agent-token',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
