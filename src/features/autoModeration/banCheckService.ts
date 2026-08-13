import type { BotClient } from '@bot/client.js';
import { database } from '@database/index.js';
import { logger } from '@logger/index.js';

export class BanCheckService {
  private checkInterval: Timer | null = null;
  private readonly CHECK_INTERVAL_MS = 60000; // Check every minute

  async start(client: BotClient): Promise<void> {
    logger.info('Ban check service started');

    // Initial check
    await this.checkAndUnbanExpired(client);

    // Set up recurring check
    this.checkInterval = setInterval(() => {
      this.checkAndUnbanExpired(client).catch((error) => {
        logger.error('Error in ban check service', { error: error as Error });
      });
    }, this.CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Ban check service stopped');
    }
  }

  private async checkAndUnbanExpired(client: BotClient): Promise<void> {
    try {
      const expiredBans = database.getExpiredBans();

      for (const timedBan of expiredBans) {
        try {
          const guild = client.guilds.cache.get(timedBan.guildId);
          if (!guild) {
            logger.warn(`Guild ${timedBan.guildId} not found, skipping unban`);
            database.removeTimedBan(timedBan.id);
            continue;
          }

          await guild.members.unban(timedBan.userId, 'Automatic unban - timed ban expired');
          database.removeTimedBan(timedBan.id);
          logger.debug(`Unbanned user ${timedBan.userId} in guild ${timedBan.guildId}`);
        } catch (error) {
          const err = error as Error;
          logger.error(`Error unbanning user ${timedBan.userId} in guild ${timedBan.guildId}`, {
            error: err,
          });
        }
      }
    } catch (error) {
      logger.error('Error checking for expired bans', { error: error as Error });
    }
  }
}

export const banCheckService = new BanCheckService();
