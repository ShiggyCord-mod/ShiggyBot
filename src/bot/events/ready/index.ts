import type { Client, PresenceStatusData } from 'discord.js';
import { ActivityType } from 'discord.js';
import { BOT_INFO } from '@config/constants.js';
import { logger } from '@logger/index.js';
import { database } from '@database/index.js';
import type { Event } from '@dtypes/bot/index.js';
import { GuildModelHelper } from '@database/models/guild.js';

const event: Event = {
  name: 'clientReady',
  once: true,

  async execute(...args: unknown[]): Promise<void> {
    const client = args[0] as Client<true>;

    logger.info(`Logged in as ${client.user.tag}`, { context: 'Ready' });
    logger.info(`${BOT_INFO.name} v${BOT_INFO.version} is ready!`);

    try {
      await client.user.setPresence({
        status: 'idle' as PresenceStatusData,
        activities: [
          {
            name: 'with ComponentsV2',
            type: ActivityType.Playing,
          },
        ],
        afk: false,
      });

      logger.info('Presence set successfully (idle)');
    } catch (error) {
      logger.error('Failed to set presence', { error: error as Error });
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
