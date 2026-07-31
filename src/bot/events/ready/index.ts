import type { Client, PresenceStatusData } from 'discord.js';
import { BOT_INFO } from '@config/constants.js';
import { logger } from '@logger/index.js';
import { database } from '@database/index.js';
import type { Event } from '@dtypes/bot';
import { GuildModelHelper } from '@database/models/guild.js';
import { getEnvironment } from '@config/environment.js';
import { PresenceFeature } from '@features/presence';
import { AutoModerationFeature } from '@features/autoModeration';
import { DashboardFeature } from '@features/dashboard';
import type { BotClient } from '@bot/client.js';

const event: Event = {
  name: 'clientReady',
  once: true,

  async execute(...args: unknown[]): Promise<void> {
    const client = args[0] as Client<true>;
    const env = getEnvironment();

    logger.info(`Logged in as ${client.user.tag}`, { context: 'Ready' });
    logger.info(`${BOT_INFO.name} v${BOT_INFO.version} is ready!`);

    try {
      const presence = new PresenceFeature(client, {
        status: env.PRESENCE_STATUS as PresenceStatusData,
        intervalMs: env.PRESENCE_INTERVAL * 1000,
        repoName: env.GITHUB_REPO,
        githubToken: env.GITHUB_TOKEN,
      });

      await presence.start();
      logger.info('Presence rotation started', { context: 'Ready' });
    } catch (error) {
      logger.error('Failed to start presence', { error: error as Error });
    }

    const autoModeration = new AutoModerationFeature(client);
    autoModeration.start();

    try {
      const dashboard = new DashboardFeature(client as BotClient, {
        token: env.DASHBOARD_TOKEN ?? '',
        hostname: env.DASHBOARD_HOST,
        port: env.DASHBOARD_PORT,
        webDir: env.DASHBOARD_WEB_DIR,
      });
      dashboard.start();
    } catch (error) {
      logger.error('Failed to start dashboard', { context: 'Ready', error: error as Error });
    }

    const guilds = client.guilds.cache;
    logger.info(`Serving ${guilds.size} guilds`);

    for (const [, guild] of guilds) {
      try {
        const existingGuild = database.getGuild(guild.id);
        if (!existingGuild) {
          const newGuild = GuildModelHelper.createDefault(guild.id, guild.name, guild.ownerId);
          database.createGuild(newGuild);
          logger.debug(`Created guild record for ${guild.name}`);
        }
      } catch (error) {
        logger.error(`Failed to sync guild ${guild.name}`, { error: error as Error });
      }
    }

    logger.info('Guild sync completed');
  },
};

export default event;
