#!/usr/bin/env bun

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

let botProcess: ReturnType<typeof spawn> | null = null;
let isRestarting = false;

function startBot() {
  console.log('[dev] Starting bot...');
  
  botProcess = spawn('bun', ['run', 'src/index.ts'], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, BOT_DEBUG: 'true', LOG_LEVEL: 'debug' },
  });

  botProcess.on('exit', (code, signal) => {
    console.log(`[dev] Bot exited with code ${code}, signal ${signal}`);
    if (!isRestarting) {
      console.log('[dev] Bot stopped unexpectedly. Restarting in 2s...');
      setTimeout(startBot, 2000);
    }
  });

  botProcess.on('error', (err) => {
    console.error('[dev] Failed to start bot:', err);
  });
}

function stopBot(): Promise<void> {
  if (!botProcess) return Promise.resolve();
  
  const process = botProcess;
  console.log('[dev] Stopping bot...');
  
  process.kill('SIGTERM');
  
  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      console.log('[dev] Force killing bot...');
      process.kill('SIGKILL');
      resolve();
    }, 3000);
    
    process.on('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function restartBot() {
  if (isRestarting) return;
  isRestarting = true;
  
  console.log('[dev] Restarting bot...');
  await stopBot();
  isRestarting = false;
  startBot();
}

startBot();

process.stdin.on('data', (data) => {
  const input = data.toString().trim();
  if (input === 'r' || input === 'restart') {
    restartBot();
  } else if (input === 'q' || input === 'quit') {
    console.log('[dev] Quitting...');
    isRestarting = true;
    stopBot().then(() => process.exit(0));
  }
});

console.log('[dev] Commands:');
console.log('  r / restart - Restart bot');
console.log('  q / quit    - Stop and exit');

process.on('SIGINT', () => {
  console.log('\n[dev] Shutting down...');
  isRestarting = true;
  stopBot().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
  isRestarting = true;
  stopBot().then(() => process.exit(0));
});