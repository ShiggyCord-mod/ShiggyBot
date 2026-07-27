export interface DatabaseConfig {
  path: string;
  walMode?: boolean;
  foreignKeys?: boolean;
}

export interface UserModel {
  id: string;
  discordId: string;
  username: string;
  discriminator: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  settings: UserSettings;
}

export interface UserSettings {
  language: string;
  notifications: boolean;
  theme: string;
}

export interface GuildModel {
  id: string;
  discordId: string;
  name: string;
  icon?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  settings: GuildSettings;
}

export interface GuildSettings {
  prefix: string;
  welcomeChannel?: string;
  logChannel?: string;
  autoRole?: string;
  muteRole?: string;
}

export interface CommandLogModel {
  id: string;
  command: string;
  userId: string;
  guildId?: string;
  channelId: string;
  success: boolean;
  error?: string;
  executionTime: number;
  createdAt: Date;
}

export interface WarnModel {
  id: string;
  userId: string;
  guildId: string;
  moderatorId: string;
  reason: string;
  createdAt: Date;
}

export interface MuteModel {
  id: string;
  userId: string;
  guildId: string;
  moderatorId: string;
  reason?: string;
  expiresAt?: Date;
  createdAt: Date;
}

export interface BanModel {
  id: string;
  userId: string;
  guildId: string;
  moderatorId: string;
  reason?: string;
  createdAt: Date;
}

export interface EconomyModel {
  id: string;
  userId: string;
  guildId: string;
  balance: number;
  bank: number;
  lastDaily: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CooldownModel {
  id: string;
  userId: string;
  command: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface ReminderModel {
  id: string;
  userId: string;
  channelId: string;
  message: string;
  remindAt: Date;
  createdAt: Date;
  completed: boolean;
}

export interface TagModel {
  id: string;
  name: string;
  content: string;
  ownerId: string;
  guildId?: string;
  uses: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StarModel {
  id: string;
  messageId: string;
  channelId: string;
  guildId: string;
  userId: string;
  stars: number;
  createdAt: Date;
}

export interface PlaylistModel {
  id: string;
  name: string;
  userId: string;
  guildId: string;
  songs: SongModel[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SongModel {
  id: string;
  title: string;
  url: string;
  duration: number;
  thumbnail?: string;
  requestedBy: string;
}

export type DatabaseModels = {
  users: UserModel;
  guilds: GuildModel;
  commandLogs: CommandLogModel;
  warns: WarnModel;
  mutes: MuteModel;
  bans: BanModel;
  economy: EconomyModel;
  cooldowns: CooldownModel;
  reminders: ReminderModel;
  tags: TagModel;
  stars: StarModel;
  playlists: PlaylistModel;
};
