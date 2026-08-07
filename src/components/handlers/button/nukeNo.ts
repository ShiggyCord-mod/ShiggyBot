import { MessageFlags } from 'discord.js';
import type { ButtonInteraction } from 'discord.js';
import type { ButtonCommand } from '@dtypes/bot';
import { ContainerBuilder, TextDisplayBuilder } from 'discord.js';
import { getPendingNuke, takePendingNuke } from '../../../commands/moderation/nuke/service.js';

const component: ButtonCommand = {
  id: 'nuke_no',

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
        content: 'Only the user who ran the command can cancel the nuke.',
        ephemeral: true,
      });
      return;
    }

    takePendingNuke(interaction.message.id);

    const container = new ContainerBuilder()
      .setAccentColor(0x95a5a6)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '# \u{1f504} Nuke Cancelled\n\nThe channel was not modified.'
        )
      );

    await interaction.update({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export default component;
