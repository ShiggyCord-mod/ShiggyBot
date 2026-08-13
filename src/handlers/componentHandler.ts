import { Collection } from '@discordjs/collection';
import type { ButtonCommand, SelectCommand, ModalCommand } from '@dtypes/bot';
import { logger } from '@logger/index.js';
import { join } from 'path';

import componentsList from '../components/handlers/index.js';

export class ComponentHandler {
  private handlersPath: string;

  constructor(
    private client: {
      buttons: Collection<string, ButtonCommand>;
      selects: Collection<string, SelectCommand>;
      modals: Collection<string, ModalCommand>;
    }
  ) {
    const basePath =
      import.meta.dir.includes('/handlers') || import.meta.dir.includes('\\handlers')
        ? import.meta.dir
        : process.cwd();
    this.handlersPath = join(basePath, '..', 'components', 'handlers');
    if (!basePath.includes('/handlers') && !basePath.includes('\\handlers')) {
      this.handlersPath = join(basePath, 'src', 'components', 'handlers');
    }
  }

  async loadComponents(): Promise<void> {
    try {
      try {
        const list: any[] = (componentsList as any) || [];

        for (const component of list) {
          try {
            if (!('id' in component && 'execute' in component)) {
              logger.warn('Component is missing required properties');
              continue;
            }

            // infer type by checking exported metadata or id prefixes
            if (component.type === 'modal') {
              this.client.modals.set(component.id, component as ModalCommand);
              logger.debug(`Loaded modal component: ${component.id}`);
            } else if (component.type === 'select' || component.id?.includes('select')) {
              this.client.selects.set(component.id, component as SelectCommand);
              logger.debug(`Loaded select component: ${component.id}`);
            } else {
              this.client.buttons.set(component.id, component as ButtonCommand);
              logger.debug(`Loaded button component: ${component.id}`);
            }
          } catch (error) {
            logger.error('Error loading component', { error: error as Error });
          }
        }

        logger.info(
          `Loaded ${this.client.buttons.size} buttons, ${this.client.selects.size} selects, and ${this.client.modals.size} modals`
        );
        return;
      } catch {
        // fallback to filesystem discovery
      }

      // filesystem discovery removed; using static components list for bundling

      logger.info(
        `Loaded ${this.client.buttons.size} buttons, ${this.client.selects.size} selects, and ${this.client.modals.size} modals`
      );
    } catch (error) {
      logger.error('Error loading components', { error: error as Error });
    }
  }

  // filesystem discovery removed; no-op
  private findFiles(_: string): string[] {
    return [];
  }
}
