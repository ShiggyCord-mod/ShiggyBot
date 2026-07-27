import { MessageFlags, TextChannel } from 'discord.js';
import type { Message } from 'discord.js';
import type { PrefixCommand } from '@dtypes/bot/index.js';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from 'discord.js';

const command: PrefixCommand = {
  name: 'google',
  description: 'Search Google directly from Discord',
  category: 'search',
  aliases: ['g', 'search'],
  cooldown: 3,
  prefix: true,

  async execute(message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
      const container = new ContainerBuilder()
        .setAccentColor(0xe74c3c)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Error\n\nUsage: `google <query>`')
        );

      await (message.channel as TextChannel).send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const query = args.join(' ');
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    const container = new ContainerBuilder()
      .setAccentColor(0x00ff00)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('# \u{1f50d} Google Search'))
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Query:** ${query}\n\n${url}`)
      );

    await (message.channel as TextChannel).send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
