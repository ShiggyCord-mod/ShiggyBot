import { Database, type SQLQueryBindings } from 'bun:sqlite';
import type {
  UserModel,
  GuildModel,
  CommandLogModel,
  EconomyModel,
  ReminderModel,
  TagModel,
} from '@dtypes/database/index.js';
import { getEnvironment } from '@config/environment.js';
import { logger } from '@logger/index.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

export class DatabaseClient {
  private db: Database;
  private static instance: DatabaseClient;

  private constructor() {
    const env = getEnvironment();
    const dbDir = dirname(env.DATABASE_PATH);
    mkdirSync(dbDir, { recursive: true });

    this.db = new Database(env.DATABASE_PATH);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA foreign_keys = ON');

    this.initializeTables();
    logger.info('Database client initialized');
  }

  static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        discordId TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        discriminator TEXT NOT NULL,
        avatar TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        settings TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS guilds (
        id TEXT PRIMARY KEY,
        discordId TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        icon TEXT,
        ownerId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        settings TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS command_logs (
        id TEXT PRIMARY KEY,
        command TEXT NOT NULL,
        userId TEXT NOT NULL,
        guildId TEXT,
        channelId TEXT NOT NULL,
        success INTEGER NOT NULL DEFAULT 1,
        error TEXT,
        executionTime INTEGER NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS warns (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        guildId TEXT NOT NULL,
        moderatorId TEXT NOT NULL,
        reason TEXT,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS economy (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        guildId TEXT NOT NULL,
        balance INTEGER NOT NULL DEFAULT 0,
        bank INTEGER NOT NULL DEFAULT 0,
        lastDaily TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        UNIQUE(userId, guildId)
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        channelId TEXT NOT NULL,
        message TEXT NOT NULL,
        remindAt TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        ownerId TEXT NOT NULL,
        guildId TEXT,
        uses INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        UNIQUE(name, guildId)
      );

      CREATE TABLE IF NOT EXISTS disabled_commands (
        id TEXT PRIMARY KEY,
        guildId TEXT NOT NULL,
        command TEXT NOT NULL,
        disabledBy TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        UNIQUE(guildId, command)
      );

      CREATE TABLE IF NOT EXISTS welcome_roles (
        id TEXT PRIMARY KEY,
        guildId TEXT UNIQUE NOT NULL,
        roleId TEXT NOT NULL,
        setBy TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_discordId ON users(discordId);
      CREATE INDEX IF NOT EXISTS idx_guilds_discordId ON guilds(discordId);
      CREATE INDEX IF NOT EXISTS idx_command_logs_userId ON command_logs(userId);
      CREATE INDEX IF NOT EXISTS idx_warns_userId ON warns(userId);
      CREATE INDEX IF NOT EXISTS idx_economy_userId_guildId ON economy(userId, guildId);
      CREATE INDEX IF NOT EXISTS idx_reminders_userId ON reminders(userId);
      CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
      CREATE INDEX IF NOT EXISTS idx_disabled_commands_guildId ON disabled_commands(guildId);
      CREATE INDEX IF NOT EXISTS idx_welcome_roles_guildId ON welcome_roles(guildId);
    `);

    logger.info('Database tables initialized');
  }

  close(): void {
    this.db.close();
    logger.info('Database connection closed');
  }

  getUser(discordId: string): UserModel | null {
    try {
      const row = this.db.query('SELECT * FROM users WHERE discordId = ?').get(discordId) as
        Record<string, unknown> | undefined;
      if (!row) return null;

      return {
        ...row,
        settings: JSON.parse(row.settings as string),
        createdAt: new Date(row.createdAt as string),
        updatedAt: new Date(row.updatedAt as string),
      } as UserModel;
    } catch (error) {
      logger.error('Error fetching user', { error: error as Error });
      return null;
    }
  }

  createUser(user: UserModel): UserModel {
    try {
      this.db
        .query(
          'INSERT INTO users (id, discordId, username, discriminator, avatar, createdAt, updatedAt, settings) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          user.id,
          user.discordId,
          user.username,
          user.discriminator,
          user.avatar || null,
          user.createdAt.toISOString(),
          user.updatedAt.toISOString(),
          JSON.stringify(user.settings)
        );
      return user;
    } catch (error) {
      logger.error('Error creating user', { error: error as Error });
      throw error;
    }
  }

  updateUser(discordId: string, data: Partial<UserModel>): UserModel | null {
    try {
      const updates: string[] = [];
      const values: unknown[] = [];

      if (data.username) {
        updates.push('username = ?');
        values.push(data.username);
      }
      if (data.discriminator) {
        updates.push('discriminator = ?');
        values.push(data.discriminator);
      }
      if (data.avatar !== undefined) {
        updates.push('avatar = ?');
        values.push(data.avatar);
      }
      if (data.settings) {
        updates.push('settings = ?');
        values.push(JSON.stringify(data.settings));
      }
      updates.push('updatedAt = ?');
      values.push(new Date().toISOString());
      values.push(discordId);

      this.db
        .query(`UPDATE users SET ${updates.join(', ')} WHERE discordId = ?`)
        .run(...(values as SQLQueryBindings[]));
      return this.getUser(discordId);
    } catch (error) {
      logger.error('Error updating user', { error: error as Error });
      return null;
    }
  }

  getGuild(discordId: string): GuildModel | null {
    try {
      const row = this.db.query('SELECT * FROM guilds WHERE discordId = ?').get(discordId) as
        Record<string, unknown> | undefined;
      if (!row) return null;

      return {
        ...row,
        settings: JSON.parse(row.settings as string),
        createdAt: new Date(row.createdAt as string),
        updatedAt: new Date(row.updatedAt as string),
      } as GuildModel;
    } catch (error) {
      logger.error('Error fetching guild', { error: error as Error });
      return null;
    }
  }

  createGuild(guild: GuildModel): GuildModel {
    try {
      this.db
        .query(
          'INSERT INTO guilds (id, discordId, name, icon, ownerId, createdAt, updatedAt, settings) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          guild.id,
          guild.discordId,
          guild.name,
          guild.icon || null,
          guild.ownerId,
          guild.createdAt.toISOString(),
          guild.updatedAt.toISOString(),
          JSON.stringify(guild.settings)
        );
      return guild;
    } catch (error) {
      logger.error('Error creating guild', { error: error as Error });
      throw error;
    }
  }

  logCommand(log: Omit<CommandLogModel, 'id'>): CommandLogModel {
    try {
      const entry: CommandLogModel = {
        id: crypto.randomUUID(),
        ...log,
      };

      this.db
        .query(
          'INSERT INTO command_logs (id, command, userId, guildId, channelId, success, error, executionTime, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          entry.id,
          entry.command,
          entry.userId,
          entry.guildId || null,
          entry.channelId,
          entry.success ? 1 : 0,
          entry.error || null,
          entry.executionTime,
          entry.createdAt.toISOString()
        );
      return entry;
    } catch (error) {
      logger.error('Error logging command', { error: error as Error });
      throw error;
    }
  }

  getBalance(userId: string, guildId: string): EconomyModel | null {
    try {
      const row = this.db
        .query('SELECT * FROM economy WHERE userId = ? AND guildId = ?')
        .get(userId, guildId) as Record<string, unknown> | undefined;
      if (!row) return null;

      return {
        ...row,
        lastDaily: new Date(row.lastDaily as string),
        createdAt: new Date(row.createdAt as string),
        updatedAt: new Date(row.updatedAt as string),
      } as EconomyModel;
    } catch (error) {
      logger.error('Error fetching balance', { error: error as Error });
      return null;
    }
  }

  updateBalance(userId: string, guildId: string, amount: number): EconomyModel {
    try {
      const existing = this.getBalance(userId, guildId);

      if (existing) {
        const newBalance = existing.balance + amount;
        this.db
          .query('UPDATE economy SET balance = ?, updatedAt = ? WHERE userId = ? AND guildId = ?')
          .run(newBalance, new Date().toISOString(), userId, guildId);
        return { ...existing, balance: newBalance, updatedAt: new Date() };
      } else {
        const newEntry: EconomyModel = {
          id: crypto.randomUUID(),
          userId,
          guildId,
          balance: amount,
          bank: 0,
          lastDaily: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        this.db
          .query(
            'INSERT INTO economy (id, userId, guildId, balance, bank, lastDaily, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .run(
            newEntry.id,
            newEntry.userId,
            newEntry.guildId,
            newEntry.balance,
            newEntry.bank,
            newEntry.lastDaily.toISOString(),
            newEntry.createdAt.toISOString(),
            newEntry.updatedAt.toISOString()
          );
        return newEntry;
      }
    } catch (error) {
      logger.error('Error updating balance', { error: error as Error });
      throw error;
    }
  }

  getTag(name: string, guildId?: string): TagModel | null {
    try {
      let query = 'SELECT * FROM tags WHERE name = ?';
      const params: unknown[] = [name];

      if (guildId) {
        query += ' AND guildId = ?';
        params.push(guildId);
      }

      const row = this.db.query(query).get(...(params as SQLQueryBindings[])) as
        Record<string, unknown> | undefined;
      if (!row) return null;

      return {
        ...row,
        createdAt: new Date(row.createdAt as string),
        updatedAt: new Date(row.updatedAt as string),
      } as TagModel;
    } catch (error) {
      logger.error('Error fetching tag', { error: error as Error });
      return null;
    }
  }

  createTag(tag: TagModel): TagModel {
    try {
      this.db
        .query(
          'INSERT INTO tags (id, name, content, ownerId, guildId, uses, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          tag.id,
          tag.name,
          tag.content,
          tag.ownerId,
          tag.guildId || null,
          tag.uses,
          tag.createdAt.toISOString(),
          tag.updatedAt.toISOString()
        );
      return tag;
    } catch (error) {
      logger.error('Error creating tag', { error: error as Error });
      throw error;
    }
  }

  incrementTagUsage(tagId: string): void {
    try {
      this.db
        .query('UPDATE tags SET uses = uses + 1, updatedAt = ? WHERE id = ?')
        .run(new Date().toISOString(), tagId);
    } catch (error) {
      logger.error('Error incrementing tag usage', { error: error as Error });
    }
  }

  getDueReminders(): ReminderModel[] {
    try {
      const rows = this.db
        .query('SELECT * FROM reminders WHERE completed = 0 AND remindAt <= ?')
        .all(new Date().toISOString()) as Record<string, unknown>[];

      return rows.map((row) => ({
        ...row,
        remindAt: new Date(row.remindAt as string),
        createdAt: new Date(row.createdAt as string),
        completed: row.completed === 1,
      })) as ReminderModel[];
    } catch (error) {
      logger.error('Error fetching due reminders', { error: error as Error });
      return [];
    }
  }

  completeReminder(id: string): void {
    try {
      this.db.query('UPDATE reminders SET completed = 1 WHERE id = ?').run(id);
    } catch (error) {
      logger.error('Error completing reminder', { error: error as Error });
    }
  }

  isCommandDisabled(guildId: string, command: string): boolean {
    try {
      const row = this.db
        .query('SELECT 1 FROM disabled_commands WHERE guildId = ? AND command = ?')
        .get(guildId, command.toLowerCase());
      return row !== null;
    } catch (error) {
      logger.error('Error checking disabled command', { error: error as Error });
      return false;
    }
  }

  disableCommand(guildId: string, command: string, disabledBy: string): void {
    try {
      this.db
        .query(
          'INSERT OR IGNORE INTO disabled_commands (id, guildId, command, disabledBy, createdAt) VALUES (?, ?, ?, ?, ?)'
        )
        .run(
          crypto.randomUUID(),
          guildId,
          command.toLowerCase(),
          disabledBy,
          new Date().toISOString()
        );
    } catch (error) {
      logger.error('Error disabling command', { error: error as Error });
    }
  }

  enableCommand(guildId: string, command: string): void {
    try {
      this.db
        .query('DELETE FROM disabled_commands WHERE guildId = ? AND command = ?')
        .run(guildId, command.toLowerCase());
    } catch (error) {
      logger.error('Error enabling command', { error: error as Error });
    }
  }

  getWelcomeRole(guildId: string): string | null {
    try {
      const row = this.db
        .query('SELECT roleId FROM welcome_roles WHERE guildId = ?')
        .get(guildId) as { roleId: string } | undefined;
      return row?.roleId ?? null;
    } catch (error) {
      logger.error('Error fetching welcome role', { error: error as Error });
      return null;
    }
  }

  setWelcomeRole(guildId: string, roleId: string, setBy: string): void {
    try {
      const now = new Date().toISOString();
      const existing = this.db.query('SELECT id FROM welcome_roles WHERE guildId = ?').get(guildId);
      if (existing) {
        this.db
          .query('UPDATE welcome_roles SET roleId = ?, setBy = ?, updatedAt = ? WHERE guildId = ?')
          .run(roleId, setBy, now, guildId);
      } else {
        this.db
          .query(
            'INSERT INTO welcome_roles (id, guildId, roleId, setBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .run(crypto.randomUUID(), guildId, roleId, setBy, now, now);
      }
    } catch (error) {
      logger.error('Error setting welcome role', { error: error as Error });
    }
  }
}
