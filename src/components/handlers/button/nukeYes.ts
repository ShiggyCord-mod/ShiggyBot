import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import type { ButtonInteraction, TextChannel } from 'discord.js';
import type { ButtonCommand } from '@dtypes/bot';
import {
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from 'discord.js';
import {
  getPendingNuke,
  nukeChannel,
  takePendingNuke,
} from '../../../commands/moderation/nuke/service.js';

const component: ButtonCommand = {
  id: 'nuke_yes',

  async execute(interaction: ButtonInteraction): Promise<void> {
    const entry = getPendingNuke(interaction.message.id);

    if (!entry) {
      await interaction.reply({
        content: 'This confirmation has expired or was already used.',
        ephemeral: true,
      });
      return;
    }

    if (interaction.guild?.id !== entry.guildId) {
      await interaction.reply({
        content: 'This confirmation does not belong to this server.',
        ephemeral: true,
      });
      return;
    }

    if (interaction.user.id !== entry.authorId) {
      await interaction.reply({
        content: 'Only the user who ran the command can confirm the nuke.',
        ephemeral: true,
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: 'You need the **Administrator** permission to confirm a nuke.',
        ephemeral: true,
      });
      return;
    }

    takePendingNuke(interaction.message.id);
    await interaction.deferUpdate();

    try {
      const channel = interaction.guild?.channels.cache.get(entry.channelId);
      if (!channel?.isTextBased()) throw new Error('Channel not found');

      const cloned = await nukeChannel(
        channel as TextChannel,
        entry.reason,
        interaction.user.username
      );

      const container = new ContainerBuilder()
        .setAccentColor(0x00ff00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# \u{1f4a5} Channel Nuked!\n\nThis channel has been reset!\n**Reason:** ${entry.reason}\n**Moderator:** ${interaction.user}`
          )
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        );

      await cloned.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch {
      try {
        await interaction.followUp({
          content: 'Failed to nuke channel. Check bot permissions.',
          ephemeral: true,
        });
      } catch {
        // original channel is gone; nothing to reply to
      }
    }
  },
};

export default component;
