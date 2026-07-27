import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { BotClient } from '../../src/bot/client.js';

describe('Bot Integration', () => {
  let client: BotClient;

  beforeAll(async () => {
    client = new BotClient();
  });

  afterAll(async () => {
    if (client) {
      client.destroy();
    }
  });

  it('should create bot client', () => {
    expect(client).toBeDefined();
    expect(client.commands).toBeDefined();
    expect(client.contextCommands).toBeDefined();
  });

  it('should have empty collections initially', () => {
    expect(client.commands.size).toBe(0);
    expect(client.contextCommands.size).toBe(0);
    expect(client.buttons.size).toBe(0);
    expect(client.selects.size).toBe(0);
    expect(client.modals.size).toBe(0);
  });
});