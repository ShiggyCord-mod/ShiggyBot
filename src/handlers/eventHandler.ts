import type { Client } from 'discord.js';
import { logger } from '@logger/index.js';
import { join } from 'path';

import eventsList from '../bot/events/index.js';

export class EventHandler {
  private eventsPath: string;

  constructor(private client: Client) {
    const basePath =
      import.meta.dir.includes('/handlers') || import.meta.dir.includes('\\handlers')
        ? import.meta.dir
        : process.cwd();
    this.eventsPath = join(basePath, '..', 'bot', 'events');
    if (!basePath.includes('/handlers') && !basePath.includes('\\handlers')) {
      this.eventsPath = join(basePath, 'src', 'bot', 'events');
    }
  }

  async loadEvents(): Promise<void> {
    try {
      try {
        const list: any[] = (eventsList as any) || [];

        for (const event of list) {
          try {
            if (event.name && event.execute) {
              if (event.once) {
                this.client.once(event.name, (...args) => event.execute(...args));
              } else {
                this.client.on(event.name, (...args) => event.execute(...args));
              }
              logger.debug(`Loaded event: ${event.name}`);
            } else {
              logger.warn('Event is missing required properties');
            }
          } catch (error) {
            logger.error('Error loading event', { error: error as Error });
          }
        }

        logger.info('Events loaded successfully');
        return;
      } catch {
        // fallback to filesystem discovery
      }

      // filesystem discovery removed; using static events list for bundling

      logger.info('Events loaded successfully');
    } catch (error) {
      logger.error('Error loading events', { error: error as Error });
    }
  }
}
