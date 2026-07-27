export const commandLogSchema = {
  id: 'string',
  command: 'string',
  userId: 'string',
  guildId: 'string?',
  channelId: 'string',
  success: 'boolean',
  error: 'string?',
  executionTime: 'number',
  createdAt: 'date',
};
