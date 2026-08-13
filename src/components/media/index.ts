import { MediaGalleryBuilder, MediaGalleryItemBuilder } from 'discord.js';

export function ImageGallery(...urls: string[]): MediaGalleryBuilder {
  return new MediaGalleryBuilder().addItems(
    ...urls.map((url) => new MediaGalleryItemBuilder().setURL(url))
  );
}

export function SingleImage(url: string): MediaGalleryBuilder {
  return new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url));
}
