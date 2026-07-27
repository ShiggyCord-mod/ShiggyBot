import { Collection } from 'discord.js';
import type { ButtonCommand, SelectCommand, ModalCommand } from '@dtypes/bot/index.js';
import { logger } from '@logger/index.js';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

export class ComponentHandler {
  private handlersPath: string;

  constructor(
    private client: {
      buttons: Collection<string, ButtonCommand>;
      selects: Collection<string, SelectCommand>;
      modals: Collection<string, ModalCommand>;
    }
  ) {
    this.handlersPath = join(import.meta.dir, '..', '..', 'components', 'handlers');
  }

  async loadComponents(): Promise<void> {
    try {
      const files = this.findFiles(this.handlersPath);

      for (const filePath of files) {
        try {
          const componentModule = await import(filePath);
          const component = componentModule.default || componentModule;

          if (!('id' in component && 'execute' in component)) {
            logger.warn(`Component at ${filePath} is missing required properties`);
            continue;
          }

          const parentDir = filePath.split('/').at(-2);

          if (parentDir === 'modal') {
            this.client.modals.set(component.id, component as ModalCommand);
            logger.debug(`Loaded modal component: ${component.id}`);
          } else if (parentDir === 'select') {
            this.client.selects.set(component.id, component as SelectCommand);
            logger.debug(`Loaded select component: ${component.id}`);
          } else if (parentDir === 'button') {
            this.client.buttons.set(component.id, component as ButtonCommand);
            logger.debug(`Loaded button component: ${component.id}`);
          } else {
            logger.warn(`Unknown component type for ${filePath}, skipping`);
          }
        } catch (error) {
          logger.error(`Error loading component at ${filePath}`, { error: error as Error });
        }
      }

      logger.info(
        `Loaded ${this.client.buttons.size} buttons, ${this.client.selects.size} selects, and ${this.client.modals.size} modals`
      );
    } catch (error) {
      logger.error('Error loading components', { error: error as Error });
    }
  }

  private findFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        results.push(...this.findFiles(fullPath));
      } else if (entry.endsWith('.ts') || entry.endsWith('.js')) {
        results.push(fullPath);
      }
    }

    return results;
  }
}
