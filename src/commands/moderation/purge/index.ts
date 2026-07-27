import { MessageFlags, PermissionFlagsBits, TextChannel } from 'discord.js';
import type { Message } from 'discord.js';
import type { PrefixCommand } from '@dtypes/bot/index.js';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from 'discord.js';

const command: PrefixCommand = {
  name: 'purge',
  description: 'Delete multiple messages from a channel',
  category: 'moderation',
  cooldown: 10,
  permissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  prefix: true,

  async execute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;

    if (args.length === 0 || !/^\d+$/.test(args[0])) {
      await sendUsage(message);
      return;
    }

    const count = parseInt(args[0], 10);
    if (count < 1 || count > 100) {
      await sendError(message, 'Count must be between 1 and 100.');
      return;
    }

    const channel = message.channel as TextChannel;
    try {
      const fetched = await channel.messages.fetch({ limit: count });
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const deletable = fetched.filter((m) => m.createdTimestamp > twoWeeksAgo);

      if (deletable.size === 0) {
        await sendError(message, 'No deletable messages found.');
        return;
      }

      await channel.bulkDelete(deletable, true);

      const container = new ContainerBuilder()
        .setAccentColor(0x00ff00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# \u{1f6e1}\ufe0f Messages Purged')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Deleted:** ${deletable.size} message(s)\n**Channel:** ${channel.name}\n**Moderator:** ${message.author.username}`
          )
        );

      await (message.channel as TextChannel).send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch {
      await sendError(message, 'Failed to delete messages. Check bot permissions.');
    }
  },
};

async function sendUsage(message: Message): Promise<void> {
  const container = new ContainerBuilder()
    .setAccentColor(0xffa500)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '# \u{1f6e1}\ufe0f Purge Command\n\nDelete multiple messages from the channel\n\n## Usage\n`purge <count>` (1-100)\n\n## Example\n`purge 50`'
      )
    );

  await (message.channel as TextChannel).send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function sendError(message: Message, error: string): Promise<void> {
  const container = new ContainerBuilder()
    .setAccentColor(0xe74c3c)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Error\n\n${error}`));

  await (message.channel as TextChannel).send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

export default command;
