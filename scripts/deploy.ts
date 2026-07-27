import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import { join } from 'path';

config();

const commands: any[] = [];
const commandsPath = join(import.meta.dir, '..', 'src', 'bot', 'commands');
const commandFolders = readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = join(commandsPath, folder);
  const commandFiles = readdirSync(folderPath).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = join(folderPath, file);
    try {
      const commandModule = await import(filePath);
      const command = commandModule.default || commandModule;
      
      if ('name' in command && 'description' in command) {
        commands.push({
          name: command.name,
          description: command.description,
          options: command.options || [],
        });
      }
    } catch (error) {
      console.error(`Error loading command at ${filePath}:`, error);
    }
  }
}

const contextCommands: any[] = [];
const contextCommandPath = join(import.meta.dir, '..', 'src', 'bot', 'commands');

async function loadContextCommands() {
  try {
    const folders = readdirSync(contextCommandPath);
    for (const folder of folders) {
      const folderPath = join(contextCommandPath, folder);
      const files = readdirSync(folderPath).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));
      
      for (const file of files) {
        const filePath = join(folderPath, file);
        try {
          const module = await import(filePath);
          const cmd = module.default || module;
          
          if ('name' in cmd && 'type' in cmd) {
            contextCommands.push({
              name: cmd.name,
              type: cmd.type === 'message' ? 3 : 2,
            });
          }
        } catch (error) {
          console.error(`Error loading context command at ${filePath}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error loading context commands:', error);
  }
}

await loadContextCommands();

const allCommands = [...commands, ...contextCommands];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

async function deploy() {
  try {
    console.log(`Deploying ${allCommands.length} commands...`);

    if (process.env.DISCORD_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, process.env.DISCORD_GUILD_ID),
        { body: allCommands }
      );
      console.log(`Successfully deployed ${allCommands.length} commands to guild ${process.env.DISCORD_GUILD_ID}`);
    } else {
      await rest.put(
        Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
        { body: allCommands }
      );
      console.log(`Successfully deployed ${allCommands.length} commands globally`);
    }
  } catch (error) {
    console.error('Failed to deploy commands:', error);
    process.exit(1);
  }
}

deploy();