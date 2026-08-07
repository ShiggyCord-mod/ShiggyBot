import { MessageFlags, PermissionFlagsBits, TextChannel } from 'discord.js';
import type { Message } from 'discord.js';
import type { PrefixCommand } from '@dtypes/bot';
import {
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from 'discord.js';
import { DangerButton, SecondaryButton } from '@components/buttons/index.js';
import { ActionRow } from '@components/rows/index.js';
import { registerPendingNuke } from './service.js';

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

    const reason = args.length > 0 ? args.join(' ') : 'None';
    const channelName = 'name' in channel ? channel.name : 'this channel';

    const container = new ContainerBuilder()
      .setAccentColor(0xffa500)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# \u{26a0}\ufe0f Nuke Channel\n\nAre you sure you want to nuke **#${channelName}**?\n\nThis will **delete ALL messages** and recreate the channel. This action **cannot be undone**.`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Channel:** #${channelName}\n**Reason:** ${reason}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Press **Yes** to confirm or **No** to cancel.')
      )
      .addActionRowComponents(
        ActionRow(
          DangerButton('nuke_yes', 'Yes', '\u{2705}'),
          SecondaryButton('nuke_no', 'No', '\u{274c}')
        )
      );

    const sent = await (message.channel as TextChannel).send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    registerPendingNuke(sent.id, {
      channelId: channel.id,
      guildId: message.guild.id,
      authorId: message.author.id,
      reason,
    });
  },
};

export default command;
