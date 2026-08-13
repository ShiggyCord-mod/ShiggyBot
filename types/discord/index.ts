import type {
  APIActionRowComponent,
  APIButtonComponent,
  APISelectMenuComponent,
  InteractionType,
  ComponentType,
  ButtonStyle,
} from 'discord-api-types/v10';

export type DiscordAPIActionRow = APIActionRowComponent<APIButtonComponent | APISelectMenuComponent>;
export type DiscordAPIButton = APIButtonComponent;
export type DiscordAPISelectMenu = APISelectMenuComponent;

export interface DiscordComponentData {
  type: ComponentType;
  custom_id?: string;
  disabled?: boolean;
}

export interface DiscordButtonData extends DiscordComponentData {
  style: ButtonStyle;
  label?: string;
  emoji?: string;
  url?: string;
}

export interface DiscordSelectMenuData extends DiscordComponentData {
  options: DiscordSelectOption[];
  placeholder?: string;
  min_values?: number;
  max_values?: number;
}

export interface DiscordSelectOption {
  label: string;
  value: string;
  description?: string;
  emoji?: string;
  default?: boolean;
}

export interface DiscordEmbedData {
  title?: string;
  description?: string;
  color?: number;
  timestamp?: string;
  footer?: {
    text: string;
    icon_url?: string;
  };
  image?: {
    url: string;
  };
  thumbnail?: {
    url: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

export interface DiscordUserData {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot?: boolean;
  system?: boolean;
  banner?: string;
  accent_color?: number;
}

export interface DiscordGuildData {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  owner_id: string;
  member_count: number;
}

export interface DiscordMemberData {
  user?: DiscordUserData;
  nick?: string;
  roles: string[];
  joined_at: string;
  premium_since?: string;
  deaf: boolean;
  mute: boolean;
}

export interface DiscordMessageData {
  id: string;
  content: string;
  channel_id: string;
  author: DiscordUserData;
  timestamp: string;
  edited_timestamp?: string;
  embeds: DiscordEmbedData[];
  components: DiscordAPIActionRow[];
  attachments: DiscordAttachmentData[];
}

export interface DiscordAttachmentData {
  id: string;
  filename: string;
  description?: string;
  content_type?: string;
  size: number;
  url: string;
  proxy_url: string;
  height?: number;
  width?: number;
}

export type DiscordInteractionData = {
  type: InteractionType;
  data?: {
    name: string;
    type: number;
    options?: Array<{
      name: string;
      type: number;
      value: unknown;
    }>;
  };
};
