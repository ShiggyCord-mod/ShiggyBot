import { MessageFlags, TextChannel, PermissionFlagsBits } from 'discord.js';
import type { Message } from 'discord.js';
import type { PrefixCommand } from '@dtypes/bot';
import { ContainerBuilder, TextDisplayBuilder } from 'discord.js';
import { database } from '@database/index.js';

const command: PrefixCommand = {
  name: 'enable',
  description: 'Re-enable a disabled command in this server',
  category: 'core',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageGuild],
  prefix: true,

  async execute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;

    if (args.length === 0) {
      const container = new ContainerBuilder()
        .setAccentColor(0xffa500)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            '# \u{1f6e1}\ufe0f Enable Command\n\nRe-enable a disabled command in this server\n\n## Usage\n`enable <command>`\n\n## Example\n`enable nuke`'
          )
        );

      await (message.channel as TextChannel).send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const commandName = args[0];
    database.enableCommand(message.guild.id, commandName);

    const container = new ContainerBuilder()
      .setAccentColor(0x00ff00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Success\n\nCommand \`${commandName}\` has been enabled in this server.`
        )
      );

    await (message.channel as TextChannel).send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
