import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config/index';
import { pinoRedactionPaths } from './logger/index';
import { healthRoutes } from './routes/health';

export async function buildApp() {
  const isTest = process.env.NODE_ENV === 'test';

  const fastify = Fastify({
    logger: isTest
      ? false
      : {
          level: config.LOG_LEVEL,
          redact: {
            paths: pinoRedactionPaths,
            censor: '[REDACTED]',
          },
        },
    trustProxy: true,
  });

  // Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Allows swagger UI in development
  });

  // CORS allowlist
  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. mobile apps, curl) or matched origin
      if (!origin || origin === config.CORS_ORIGIN || origin.startsWith('http://localhost:')) {
        cb(null, true);
        return;
      }
      cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  // Signed cookie support for secure sessions
  await fastify.register(cookie, {
    secret: config.COOKIE_SECRET,
    hook: 'onRequest',
  });

  // Rate limiting to protect against brute force
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // OpenAPI / Swagger Documentation
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Hospital CRM API',
        description: 'Telecalling Module API (Phase 1) - Support, Admission, and Aftercare Desks',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${config.PORT}`,
          description: 'Local development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Consistent Error Handler: { error: { code, message, details? } }
  fastify.setErrorHandler((error: any, request, reply) => {
    fastify.log.error(
      {
        err: {
          message: error.message,
          stack: error.stack,
          statusCode: error.statusCode,
        },
        url: request.raw.url,
      },
      'Request error'
    );

    const statusCode = error.statusCode || 500;
    const code = error.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');
    const message = statusCode >= 500 ? 'An unexpected internal error occurred' : error.message;

    return reply.status(statusCode).send({
      error: {
        code,
        message,
        details: error.validation || error.details || undefined,
      },
    });
  });

  // Register API v1 routes
  await fastify.register(healthRoutes, { prefix: '/api/v1' });

  return fastify;
}
