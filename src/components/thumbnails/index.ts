import { ThumbnailBuilder } from 'discord.js';

export function BotThumbnail(url: string): ThumbnailBuilder {
  return new ThumbnailBuilder({ media: { url } });
}

export function UserThumbnail(url: string): ThumbnailBuilder {
  return new ThumbnailBuilder({ media: { url } });
}

export function UrlThumbnail(url: string, description?: string): ThumbnailBuilder {
  const thumb = new ThumbnailBuilder({ media: { url } });
  if (description) {
    thumb.setDescription(description);
  }
  return thumb;
}
