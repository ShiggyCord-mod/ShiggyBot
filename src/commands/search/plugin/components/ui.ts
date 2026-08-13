import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
} from 'discord.js';
import { PrimaryButton, SecondaryButton } from '@components/buttons';
import type { PluginResult } from '@dtypes/commands';
import { highlightMatch } from '../services/searchService.js';

export function getStatusEmoji(status: string): string {
  switch (status?.toUpperCase()) {
    case 'WORKING':
      return '✅';
    case 'WARNING':
      return '⚠️';
    case 'BROKEN':
      return '❌';
    default:
      return '❓';
  }
}

export function getStatusColor(status: string): number {
  switch (status?.toUpperCase()) {
    case 'WORKING':
      return 0x27ae60;
    case 'WARNING':
      return 0xf39c12;
    case 'BROKEN':
      return 0xe74c3c;
    default:
      return 0x3498db;
  }
}

export function buildPluginContainer(plugin: PluginResult, query: string): ContainerBuilder {
  const d = plugin.data;
  const statusEmoji = getStatusEmoji(d.status);
  const statusColor = getStatusColor(d.status);
  const highlightedName = highlightMatch(d.name, query);
  const authors = d.authors?.length > 0 ? d.authors.join(', ') : 'Unknown';

  const lines = [
    `# :electric_plug: ${highlightedName}\n`,
    `> ${d.description}\n`,
    `:bookmark: **Status:** ${statusEmoji} ${d.status.toUpperCase()}\n`,
    `:busts_in_silhouette: **Authors:** ${authors}\n`,
    `:link: **Source:** [GitHub](${d.sourceUrl})`,
  ];

  if (d.warningMessage) {
    lines.push(`\n:warning: **Warning:** ${d.warningMessage}`);
  }

  if (plugin.levenshteinDistance > 0) {
    lines.push(`\n:pencil2: **Search Term:** *${query}*`);
  }

  const container = new ContainerBuilder()
    .setAccentColor(statusColor)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));

  return container;
}

export function buildErrorContainer(message: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0xe74c3c)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Error\n\n${message}`));
}

export function buildNotFoundContainer(query: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0xe74c3c)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# :electric_plug: Plugin Not Found\n\nCould not find a plugin matching **${query}**\n\n:bulb: **Suggestions**\n- Try a different search term\n- Check the spelling\n- Visit the Plugins List for more options`
      )
    );
}

export function addActionButtons(
  container: ContainerBuilder,
  installId: string,
  sourceId: string
): void {
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('Click for install link'))
      .setButtonAccessory(PrimaryButton(installId, 'Install', '🔌'))
  );
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('View source code on GitHub'))
      .setButtonAccessory(SecondaryButton(sourceId, 'Source', '🔗'))
  );
}

export function buildInstallReplyContainer(name: string, url: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0x2ecc71)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# :electric_plug: Install ${name}\n\n${url}`)
    );
}

export function buildSourceReplyContainer(name: string, url: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0x3498db)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# :busts_in_silhouette: Source Code for ${name}\n\n${url}`
      )
    );
}
