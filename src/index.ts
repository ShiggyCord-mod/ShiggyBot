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

    client.on('error', (error) => {
      const err = error as Error;
      logger.error(`Discord client error: ${err.message}`, { error: err });
    });

    await client.start();

    function shutdown(reason: string): void {
      logger.info(`Received ${reason}, shutting down...`);
      try {
        client.destroy();
      } catch (error) {
        const err = error as Error;
        logger.warn(`Error during shutdown: ${err.message}`, { error: err });
      }
      process.exit(0);
    }

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    process.on('unhandledRejection', (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      logger.error(`Unhandled rejection: ${error.stack ?? error.message}`, { error });
    });

    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught exception: ${error.stack ?? error.message}`, { error });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start application', { error: error as Error });
    process.exit(1);
  }
}

main();
