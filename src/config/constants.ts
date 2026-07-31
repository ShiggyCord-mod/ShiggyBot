export const BOT_INFO = {
  name: 'ShiggyBot',
  version: '1.0.0',
  author: 'kmmiio99o',
} as const;

export const DISCORD_LIMITS = {
  maxMessageLength: 2000,
  maxEmbedLength: 6000,
  maxEmbedFields: 25,
  maxEmbedFieldName: 256,
  maxEmbedFieldValue: 1024,
  maxEmbedDescription: 4096,
  maxButtons: 5,
  maxSelectOptions: 25,
  maxComponents: 5,
  maxActionRows: 5,
} as const;

export const COLORS = {
  primary: 0x00ff00,
  secondary: 0x0099ff,
  success: 0x00ff00,
  warning: 0xffff00,
  error: 0xff0000,
  info: 0x00ffff,
} as const;

export const TIMESTAMPS = {
  short: 'T',
  long: 'f',
  relative: 'R',
} as const;

export const REGEX_PATTERNS = {
  // eslint-disable-next-line security/detect-unsafe-regex
  discordInvite: /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+/i,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
} as const;
