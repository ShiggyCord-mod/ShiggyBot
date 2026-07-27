import type {
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  AutocompleteInteraction,
  PermissionResolvable,
  Collection,
  Message,
  Client,
} from 'discord.js';
import type { ReactElement } from 'react';

export type CommandCategory =
  | 'general'
  | 'moderation'
  | 'fun'
  | 'utility'
  | 'admin'
  | 'music'
  | 'games'
  | 'economy'
  | 'search'
  | 'core';

export interface CommandOptions {
  name: string;
  description: string;
  category: CommandCategory;
  cooldown?: number;
  permissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  ownerOnly?: boolean;
  guildOnly?: boolean;
  devOnly?: boolean;
  examples?: string[];
}

export interface SlashCommand extends CommandOptions {
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export interface PrefixCommand extends CommandOptions {
  prefix: true;
  aliases?: string[];
  execute: (message: Message, args: string[], client: Client) => Promise<void>;
}

export interface ContextCommand extends CommandOptions {
  type: 'message' | 'user';
  execute: (interaction: ContextMenuCommandInteraction) => Promise<void>;
}

export interface ButtonCommand {
  id: string;
  execute: (interaction: ButtonInteraction) => Promise<void>;
}

export interface SelectCommand {
  id: string;
  execute: (interaction: StringSelectMenuInteraction) => Promise<void>;
}

export interface ModalCommand {
  id: string;
  execute: (interaction: ModalSubmitInteraction) => Promise<void>;
}

export interface EventOptions {
  name: string;
  once?: boolean;
}

export interface Event extends EventOptions {
  execute: (...args: unknown[]) => Promise<void>;
}

export interface CooldownEntry {
  userId: string;
  command: string;
  expires: number;
}

export interface CommandExecutionResult {
  success: boolean;
  error?: Error;
  executionTime: number;
}

export interface HandlerOptions {
  cooldowns: Collection<string, Collection<string, number>>;
  commands: Collection<string, SlashCommand>;
  prefixCommands: Collection<string, PrefixCommand>;
  contextCommands: Collection<string, ContextCommand>;
  buttons: Collection<string, ButtonCommand>;
  selects: Collection<string, SelectCommand>;
  modals: Collection<string, ModalCommand>;
}

export type ComponentBuilder = ReactElement | ReactElement[];
