import { MessageFlags, TextChannel, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import type { Message, Client } from 'discord.js';
import type { PrefixCommand } from '@dtypes/bot';
import { getEnvironment } from '@config/environment.js';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
} from 'discord.js';

const BOT_GIF = 'https://cdn.kmmiio99o.dev/shiggycord/l4exhy.gif';

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

function getCommandsByCategory(
  client: Client
): Record<
  string,
  Array<{ name: string; description: string; aliases?: string[]; category: string }>
> {
  const cmds = (client as any).prefixCommands as Map<string, any>;
  const seen = new Set<string>();
  const categories: Record<
    string,
    Array<{ name: string; description: string; aliases?: string[]; category: string }>
  > = {};

  for (const [, cmd] of cmds) {
    if (seen.has(cmd.name)) continue;
    seen.add(cmd.name);
    const cat = (cmd.category ?? 'Other').toLowerCase();
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(cmd);
  }

  return categories;
}

function buildCategorySelectRow(
  categories: Record<string, Array<{ name: string }>>
): ActionRowBuilder<StringSelectMenuBuilder> {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder('Select a category...');

  for (const [cat] of Object.entries(categories)) {
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

const command: PrefixCommand = {
  name: 'help',
  description: 'Show all available commands with interactive menu',
  category: 'utility',
  cooldown: 5,
  prefix: true,

  async execute(message: Message, args: string[]): Promise<void> {
    const prefix = getEnvironment().BOT_PREFIX;
    const categories = getCommandsByCategory(message.client);

    if (args.length > 0) {
      const cmdName = args[0].toLowerCase();
      const cmds = (message.client as any).prefixCommands as Map<string, any>;
      const cmd = cmds.get(cmdName);
      if (cmd) {
        const cat = (cmd.category ?? 'Other').toLowerCase();
        const color = CATEGORY_COLORS[cat] ?? 0x95a5a6;
        const emoji = CATEGORY_EMOJIS[cat] ?? '\u{1f4c1}';

        let aliasesText = '';
        if (cmd.aliases && cmd.aliases.length > 0) {
          aliasesText = `\n\u{1f517} **Aliases:** ${cmd.aliases.map((a: string) => `\`${a}\``).join(', ')}`;
        }

        const container = new ContainerBuilder()
          .setAccentColor(color)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# Command: ${cmd.name}\n\n${cmd.description ?? 'No description'}`
            )
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `${emoji} **Category:** ${cmd.category ?? 'Other'}\n\u2139\ufe0f **Usage:** \`${prefix}${cmd.name}\`${aliasesText}`
            )
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Use \`${prefix}help\` to see all commands`)
          )
          .addActionRowComponents(buildCategorySelectRow(categories));

        await (message.channel as TextChannel).send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }
    }

    let totalCommands = 0;
    for (const cmds of Object.values(categories)) {
      totalCommands += cmds.length;
    }

    const container = new ContainerBuilder()
      .setAccentColor(0x9b59b6)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# \u{1f916} ShiggyBot Help\n\n**Prefix:** \`${prefix}\`\nSelect a category below to view commands`
            )
          )
          .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: BOT_GIF } }))
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('## \u{1f4cb} Categories'));

    for (const [cat, cmds] of Object.entries(categories)) {
      const emoji = CATEGORY_EMOJIS[cat] ?? '\u{1f4c1}';
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji} **${cat.charAt(0).toUpperCase() + cat.slice(1)}** (${cmds.length})`
        )
      );
    }

    container
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Use \`${prefix}help <command>\` for details\nTotal: ${totalCommands} command(s)`
        )
      )
      .addActionRowComponents(buildCategorySelectRow(categories));

    await (message.channel as TextChannel).send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
