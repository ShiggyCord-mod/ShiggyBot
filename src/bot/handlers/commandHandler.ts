import { Collection } from 'discord.js';
import type { SlashCommand, PrefixCommand, ContextCommand } from '@dtypes/bot/index.js';
import { logger } from '@logger/index.js';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

export class CommandHandler {
  private commandsPath: string;

  constructor(
    private client: {
      commands: Collection<string, SlashCommand>;
      prefixCommands: Collection<string, PrefixCommand>;
      contextCommands: Collection<string, ContextCommand>;
    }
  ) {
    this.commandsPath = join(import.meta.dir, '..', '..', 'commands');
  }

  async loadCommands(): Promise<void> {
    try {
      const indexFiles = this.findCommandFiles(this.commandsPath);

      for (const filePath of indexFiles) {
        try {
          const commandModule = await import(filePath);
          const command = commandModule.default || commandModule;

          if ('prefix' in command && command.prefix === true) {
            this.client.prefixCommands.set(command.name, command as PrefixCommand);
            if (command.aliases) {
              for (const alias of command.aliases) {
                this.client.prefixCommands.set(alias, command as PrefixCommand);
              }
            }
            logger.debug(`Loaded prefix command: ${command.name}`);
          } else if ('execute' in command && 'name' in command) {
            if ('type' in command) {
              this.client.contextCommands.set(command.name, command as ContextCommand);
              logger.debug(`Loaded context command: ${command.name}`);
            } else {
              this.client.commands.set(command.name, command as SlashCommand);
              logger.debug(`Loaded slash command: ${command.name}`);
            }
          } else {
            logger.warn(`Command at ${filePath} is missing required properties`);
          }
        } catch (error) {
          logger.error(`Error loading command at ${filePath}`, { error: error as Error });
        }
      }

      logger.info(
        `Loaded ${this.client.commands.size} slash, ${this.client.prefixCommands.size} prefix, and ${this.client.contextCommands.size} context commands`
      );
    } catch (error) {
      logger.error('Error loading commands', { error: error as Error });
    }
  }

  private findCommandFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        results.push(...this.findCommandFiles(fullPath));
      } else if (entry === 'index.ts' || entry === 'index.js') {
        results.push(fullPath);
      }
    }

    return results;
  }
}
