export interface ApiBotUser {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string | null;
}

export interface ApiGuild {
  id: string;
  name: string;
  iconUrl: string | null;
  memberCount: number;
  ownerId: string;
}

export interface ApiChannel {
  id: string;
  guildId: string;
  name: string;
  type: string;
  topic: string | null;
  position: number;
  nsfw: boolean;
  parentId: string | null;
}

export interface ApiAuthor {
  id: string;
  username: string;
  globalName: string | null;
  displayName: string;
  avatarUrl: string | null;
  bot: boolean;
}

export interface ApiAttachment {
  url: string;
  name: string;
  contentType: string | null;
}

export interface ApiEmbedImage {
  url: string;
  width: number | null;
  height: number | null;
}

export interface ApiEmbed {
  title: string | null;
  description: string | null;
  url: string | null;
  color: number | null;
  image: ApiEmbedImage | null;
  thumbnail: ApiEmbedImage | null;
}

export interface ApiMessage {
  id: string;
  guildId: string;
  channelId: string;
  content: string;
  author: ApiAuthor;
  attachments: ApiAttachment[];
  embeds: ApiEmbed[];
  createdTimestamp: number;
  editedTimestamp: number | null;
}

export interface ApiCommand {
  name: string;
  description: string;
  category: string;
  aliases: string[];
  disabled: boolean;
}

export interface ApiStatus {
  user: ApiBotUser | null;
  guilds: number;
  channels: number;
  members: number;
  uptime: number;
  ping: number;
  presence: string;
  dashboardUptime: number;
}

export interface WsEvent {
  type: 'messageCreate' | 'messageDelete';
  data: ApiMessage | { id: string; channelId: string; guildId: string };
}
