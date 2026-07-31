import type { Client } from 'discord.js';
import { logger } from '@logger/index.js';
import { readdirSync } from 'fs';
import { join } from 'path';

export class EventHandler {
  private eventsPath: string;

  constructor(private client: Client) {
    this.eventsPath = join(import.meta.dir, '..', 'events');
  }

  async loadEvents(): Promise<void> {
    try {
      const eventFolders = readdirSync(this.eventsPath);

      for (const folder of eventFolders) {
        const folderPath = join(this.eventsPath, folder);
        const eventFiles = readdirSync(folderPath).filter(
          (file) => file.endsWith('.ts') || file.endsWith('.js')
        );

        for (const file of eventFiles) {
          const filePath = join(folderPath, file);
          try {
            const eventModule = await import(filePath);
            const event = eventModule.default || eventModule;

            if (event.name && event.execute) {
              if (event.once) {
                this.client.once(event.name, (...args) => event.execute(...args));
              } else {
                this.client.on(event.name, (...args) => event.execute(...args));
              }
              logger.debug(`Loaded event: ${event.name}`);
            } else {
              logger.warn(`Event at ${filePath} is missing required properties`);
            }
          } catch (error) {
            logger.error(`Error loading event at ${filePath}`, { error: error as Error });
          }
        }
      }

      logger.info('Events loaded successfully');
    } catch (error) {
      logger.error('Error loading events', { error: error as Error });
    }
  }
}
