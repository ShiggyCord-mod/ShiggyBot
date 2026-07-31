import { MessageFlags, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from 'discord.js';
import type { SelectCommand } from '@dtypes/bot';
import { getEnvironment } from '@config/environment.js';

const CATEGORY_COLORS: Record<string, number> = {
  utility: 0x1e90ff,
  moderation: 0xffa500,
  search: 0x00ff00,
  fun: 0xe91e63,
  core: 0x95a5a6,
};

const CATEGORY_EMOJIS: Record<string, string> = {
  utility: '\u{1f527}',
  moderation: '\u{1f6e1}\ufe0f',
  search: '\u{1f50d}',
  fun: '\u{1f3ae}',
  core: '\u{1f4c1}',
};

function buildCategorySelectRow(): ActionRowBuilder<StringSelectMenuBuilder> {
  const categories = Object.keys(CATEGORY_COLORS);
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder('Select a category...');

  for (const cat of categories) {
    const emoji = CATEGORY_EMOJIS[cat] ?? '\u{1f4c1}';
    selectMenu.addOptions({
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      value: cat.toUpperCase(),
      description: `View ${cat} commands`,
      emoji,
    });
  }

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
}

const component: SelectCommand = {
  id: 'help_category_select',

  async execute(interaction: any): Promise<void> {
    const selected = interaction.values[0];
    const category = selected.toLowerCase();
    const prefix = getEnvironment().BOT_PREFIX;

    const cmds = (interaction.client as any).prefixCommands as Map<string, any>;
    const categoryCommands: Array<{ name: string; description: string; aliases?: string[] }> = [];
    const seen = new Set<string>();

    for (const [, cmd] of cmds) {
      if (seen.has(cmd.name)) continue;
      if ((cmd.category ?? 'other').toLowerCase() !== category) continue;
      seen.add(cmd.name);
      categoryCommands.push(cmd);
    }

    const color = CATEGORY_COLORS[category] ?? 0x95a5a6;
    const emoji = CATEGORY_EMOJIS[category] ?? '\u{1f4c1}';

    const container = new ContainerBuilder()
      .setAccentColor(color)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      );

    for (const cmd of categoryCommands) {
      let desc = `**\`${prefix}${cmd.name}\`** — ${cmd.description ?? 'No description'}`;
      if (cmd.aliases && cmd.aliases.length > 0) {
        desc += `\n> Aliases: ${cmd.aliases.map((a: string) => `\`${a}\``).join(', ')}`;
      }
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(desc));
    }

    container
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Use \`${prefix}help <command>\` for details\nTotal: ${categoryCommands.length} command(s)`
        )
      )
      .addActionRowComponents(buildCategorySelectRow());

    await interaction.update({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export default component;
