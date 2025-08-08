import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Odontofy API',
      version: '1.0.0',
      description: 'Documentación para el uso de la API de Odontofy',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // adapta esto a tu estructura
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
