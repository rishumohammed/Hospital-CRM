import { buildApp } from './app';
import { config } from './config/index';
import { logger } from './logger/index';

async function startServer() {
  const app = await buildApp();

  try {
    const address = await app.listen({
      port: config.PORT,
      host: config.HOST,
    });
    logger.info(`Server listening at ${address}`);
    logger.info(`Swagger docs available at ${address}/docs`);
  } catch (err) {
    logger.error({ err }, 'Error starting server');
    process.exit(1);
  }
}

startServer();
