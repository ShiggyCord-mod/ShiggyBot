import type { UserModel, UserSettings } from '@dtypes/database';

export class UserModelHelper {
  static createDefault(discordId: string, username: string, discriminator: string): UserModel {
    return {
      id: crypto.randomUUID(),
      discordId,
      username,
      discriminator,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: this.defaultSettings(),
    };
  }

  static defaultSettings(): UserSettings {
    return {
      language: 'en',
      notifications: true,
      theme: 'default',
    };
  }

  static validate(user: unknown): user is UserModel {
    const u = user as UserModel;
    return (
      typeof u.id === 'string' &&
      typeof u.discordId === 'string' &&
      typeof u.username === 'string' &&
      typeof u.discriminator === 'string' &&
      u.createdAt instanceof Date &&
      u.updatedAt instanceof Date
    );
  }

  static formatTag(user: UserModel): string {
    return `${user.username}#${user.discriminator}`;
  }
}
