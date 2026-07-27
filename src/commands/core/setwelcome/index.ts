import { MessageFlags, TextChannel, PermissionFlagsBits } from 'discord.js';
import type { Message } from 'discord.js';
import type { PrefixCommand } from '@dtypes/bot/index.js';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from 'discord.js';
import { resolveRole } from '@utils/resolve/index.js';
import { database } from '@database/index.js';

const command: PrefixCommand = {
  name: 'setwelcome',
  description: 'Set the welcome role for new members in this server',
  category: 'core',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageGuild],
  prefix: true,

  async execute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;

    if (args.length === 0) {
      const currentRoleId = database.getWelcomeRole(message.guild.id);
      let currentStr = 'None';

      if (currentRoleId && currentRoleId !== '0') {
        const role = message.guild.roles.cache.get(currentRoleId);
        currentStr = role?.name ?? currentRoleId;
      }

      const container = new ContainerBuilder()
        .setAccentColor(0x1e90ff)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Welcome Role\n\n${currentStr === 'None' ? 'No welcome role is set for this server.' : `Current welcome role: ${currentStr}`}`
          )
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            '## Usage\n`setwelcome <role>`\n\n## Example\n`setwelcome @Member`\n\n## Disable\n`setwelcome disable`'
          )
        );

      await (message.channel as TextChannel).send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    if (
      args[0].toLowerCase() === 'disable' ||
      args[0].toLowerCase() === 'none' ||
      args[0].toLowerCase() === 'off'
    ) {
      database.setWelcomeRole(message.guild.id, '0', message.author.id);

      const container = new ContainerBuilder()
        .setAccentColor(0x00ff00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            '# Success\n\nWelcome role has been disabled for this server.'
          )
        );

      await (message.channel as TextChannel).send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const roleArg = args.join(' ');
    const role = resolveRole(message.guild, roleArg);

    if (!role) {
      const container = new ContainerBuilder()
        .setAccentColor(0xe74c3c)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Error\n\nRole not found.')
        );

      await (message.channel as TextChannel).send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    database.setWelcomeRole(message.guild.id, role.id, message.author.id);

    const container = new ContainerBuilder()
      .setAccentColor(0x00ff00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Success\n\nWelcome role set to **${role.name}** for this server.`
        )
      );

    await (message.channel as TextChannel).send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
