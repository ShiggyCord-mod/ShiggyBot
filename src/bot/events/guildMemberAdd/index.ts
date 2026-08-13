import type { GuildMember } from 'discord.js';
import { logger } from '@logger/index.js';
import { database } from '@database/index.js';
import type { Event } from '@dtypes/bot';

const event: Event = {
  name: 'guildMemberAdd',
  once: false,

  async execute(...args: unknown[]): Promise<void> {
    const member = args[0] as GuildMember;

    try {
      const welcomeRoleId = database.getWelcomeRole(member.guild.id);

      if (!welcomeRoleId || welcomeRoleId === '0') {
        return; // No welcome role configured
      }

      const role = member.guild.roles.cache.get(welcomeRoleId);
      if (!role) {
        logger.warn(`Welcome role ${welcomeRoleId} not found in guild ${member.guild.id}`);
        return;
      }

      await member.roles.add(role, 'Automatic welcome role');
      logger.debug(`Applied welcome role to ${member.user.tag} in ${member.guild.name}`);
    } catch (error) {
      logger.error(`Error applying welcome role to ${member.user.tag}`, { error: error as Error });
    }
  },
};

export default event;
