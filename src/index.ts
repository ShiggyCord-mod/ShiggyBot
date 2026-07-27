import { BotClient } from './bot/client.js';
import { logger } from './logger/index.js';
import { getEnvironment } from './config/environment.js';

async function main() {
  try {
    const env = getEnvironment();

    logger.info('Starting application...', { context: 'Main' });
    logger.info(`Environment: ${env.BOT_ENV}`);
    logger.debug('Debug mode enabled');

    const client = new BotClient();
    await client.start();

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down...');
      client.destroy();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down...');
      client.destroy();
      process.exit(0);
    });

    process.on('unhandledRejection', (error) => {
      logger.error('Unhandled rejection', { error: error as Error });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start application', { error: error as Error });
    process.exit(1);
  }
}

main();
