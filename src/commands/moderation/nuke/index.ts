import { MessageFlags, TextChannel, PermissionFlagsBits } from 'discord.js';
import type { Message } from 'discord.js';
import type { PrefixCommand } from '@dtypes/bot';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from 'discord.js';

const command: PrefixCommand = {
  name: 'nuke',
  description: 'Clone and delete a channel to remove all messages (Administrator only)',
  category: 'moderation',
  cooldown: 30,
  permissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageChannels],
  prefix: true,

  async execute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;

    const channel = message.channel;
    if (!('clone' in channel)) return;

    if (args.length > 0 && args[0].toLowerCase() === 'confirm') {
      const reason = args.length > 1 ? args.slice(1).join(' ') : 'None';
      await nukeChannel(message, reason);
      return;
    }

    const reasonHint = args.length > 0 ? args.join(' ') : null;

    const container = new ContainerBuilder()
      .setAccentColor(0xffa500)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# \u{26a0}\ufe0f Nuke Channel\n\nAre you sure you want to nuke #${'name' in channel ? channel.name : 'this channel'}? This will delete ALL messages and recreate the channel.\n\n**Channel:** #${'name' in channel ? channel.name : 'this channel'}\n**Reason:** ${reasonHint ?? 'None'}\n**To confirm:** \`nuke confirm${reasonHint ? ' ' + reasonHint : ''}\`\n\n*This action cannot be undone!*`
        )
      );

    await (message.channel as TextChannel).send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

async function nukeChannel(message: Message, reason: string): Promise<void> {
  const channel = message.channel;
  if (!('clone' in channel) || !message.guild) return;

  try {
    const cloned = await (channel as any).clone({
      name: (channel as any).name,
      reason: `Nuked by ${message.author.username}: ${reason}`,
    });

    const container = new ContainerBuilder()
      .setAccentColor(0x00ff00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# \u{1f4a5} Channel Nuked!\n\nThis channel has been reset!\n**Reason:** ${reason}\n**Moderator:** ${message.author}`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      );

    await cloned.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch {
    const container = new ContainerBuilder()
      .setAccentColor(0xe74c3c)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '# Error\n\nFailed to nuke channel. Check bot permissions.'
        )
      );

    await (message.channel as TextChannel).send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

export default command;
