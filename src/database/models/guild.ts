import type { GuildModel, GuildSettings } from '@dtypes/database/index.js';

export class GuildModelHelper {
  static createDefault(discordId: string, name: string, ownerId: string): GuildModel {
    return {
      id: crypto.randomUUID(),
      discordId,
      name,
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: this.defaultSettings(),
    };
  }

  static defaultSettings(): GuildSettings {
    return {
      prefix: '!',
      welcomeChannel: undefined,
      logChannel: undefined,
      autoRole: undefined,
      muteRole: undefined,
    };
  }

  static validate(guild: unknown): guild is GuildModel {
    const g = guild as GuildModel;
    return (
      typeof g.id === 'string' &&
      typeof g.discordId === 'string' &&
      typeof g.name === 'string' &&
      typeof g.ownerId === 'string' &&
      g.createdAt instanceof Date &&
      g.updatedAt instanceof Date
    );
  }
}
