import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from 'discord.js';
import type { APIEmbed } from 'discord-api-types/v10';

export function createSuccessContainer(title: string, description: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0x00ff00)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ **${title}**`))
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
}

export function createErrorContainer(title: string, description: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0xff0000)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **${title}**`))
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
}

export function createWarningContainer(title: string, description: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0xffff00)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`⚠️ **${title}**`))
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
}

export function createInfoContainer(title: string, description: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0x00ffff)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`ℹ️ **${title}**`))
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
}

export function createEmbedToContainer(embed: APIEmbed): ContainerBuilder {
  const container = new ContainerBuilder();

  if (embed.color) {
    container.setAccentColor(embed.color);
  }

  if (embed.title) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${embed.title}**`));
  }

  if (embed.description) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(embed.description));
  }

  if (embed.fields && embed.fields.length > 0) {
    for (const field of embed.fields) {
      container.addSectionComponents(
        new SectionBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${field.name}**\n${field.value}`)
        )
      );
    }
  }

  if (embed.image) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(embed.image.url))
    );
  }

  if (embed.thumbnail) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(' '))
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: embed.thumbnail.url } }))
    );
  }

  if (embed.footer) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(embed.footer.text));
  }

  return container;
}

export function createConfirmButtons(customIdPrefix: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}_confirm`)
      .setLabel('Confirm')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}_cancel`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
  );
}

export function createPaginationButtons(
  customIdPrefix: string,
  currentPage: number,
  totalPages: number
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}_first`)
      .setLabel('First')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⏮')
      .setDisabled(currentPage === 1),
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}_previous`)
      .setLabel('Previous')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('◀')
      .setDisabled(currentPage === 1),
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}_page`)
      .setLabel(`${currentPage} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}_next`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('▶')
      .setDisabled(currentPage === totalPages),
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}_last`)
      .setLabel('Last')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⏭')
      .setDisabled(currentPage === totalPages)
  );
}
