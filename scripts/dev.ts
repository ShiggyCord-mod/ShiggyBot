#!/usr/bin/env bun

import { execFileSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const webDir = join(projectRoot, 'web');

const DEFAULT_DASHBOARD_PORT = 3000;
const VITE_PORT = 5173;

function pidsOnPort(port: number): number[] {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('netstat', ['-ano'], { encoding: 'utf8' });
      const pids = new Set<number>();
      for (const line of out.split('\n')) {
        if (!line.includes(`:${port}`)) continue;
        const tokens = line.trim().split(/\s+/);
        const pid = Number(tokens[tokens.length - 1]);
        if (Number.isInteger(pid) && pid > 0) pids.add(pid);
      }
      return [...pids];
    }

    const out = execFileSync('lsof', ['-ti', `:${port}`], { encoding: 'utf8' });
    return out
      .split('\n')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);
  } catch {
    return [];
  }
}

function killPid(pid: number): void {
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(pid), '/F'], { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGKILL');
    }
  } catch {
    // already gone
  }
}

function freePort(port: number, label: string): boolean {
  const pids = pidsOnPort(port);
  if (pids.length === 0) return false;
  console.log(`[dev] Port ${port} (${label}) is in use by PID ${pids.join(', ')} — killing it...`);
  for (const pid of pids) killPid(pid);
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

let botProcess: ReturnType<typeof spawn> | null = null;
let viteProcess: ReturnType<typeof spawn> | null = null;
let isRestarting = false;

function startBot() {
  console.log('[dev] Starting bot...');

  botProcess = spawn('bun', ['run', 'src/index.ts'], {
    cwd: projectRoot,
    stdio: 'inherit',
    detached: process.platform !== 'win32',
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

function startVite() {
  if (!existsSync(join(webDir, 'node_modules'))) {
    console.log(
      '[dev] Frontend skipped (web/ dependencies not installed). Run `bun install && bun run dev` in web/ to enable it.'
    );
    return;
  }

  console.log('[dev] Starting frontend (vite on http://localhost:5173)...');
  viteProcess = spawn('bunx', ['vite'], {
    cwd: webDir,
    stdio: 'inherit',
    detached: process.platform !== 'win32',
    env: { ...process.env },
  });

  viteProcess.on('error', (err) => {
    console.error('[dev] Failed to start vite:', err);
  });
}

function signalProcessGroup(pid: number, signal: NodeJS.Signals): void {
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  try {
    process.kill(-pid, signal);
  } catch {
    // process group already gone
  }
}

function waitForExit(child: ReturnType<typeof spawn>, timeoutMs: number): Promise<void> {
  return new Promise((resolvePromise) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolvePromise();
      return;
    }
    const timeout = setTimeout(() => resolvePromise(), timeoutMs);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolvePromise();
    });
  });
}

async function stopProcess(child: ReturnType<typeof spawn>, name: string): Promise<void> {
  if (child.pid === undefined) return;

  console.log(`[dev] Stopping ${name}...`);
  const exited = waitForExit(child, 3000);
  signalProcessGroup(child.pid, 'SIGTERM');
  await exited;

  if (child.exitCode === null && child.signalCode === null) {
    console.log(`[dev] Force killing ${name}...`);
    signalProcessGroup(child.pid, 'SIGKILL');
    await waitForExit(child, 1000);
  }
}

async function stopBot(): Promise<void> {
  const child = botProcess;
  botProcess = null;
  if (!child) return;
  await stopProcess(child, 'bot');
}

async function stopVite(): Promise<void> {
  const child = viteProcess;
  viteProcess = null;
  if (!child) return;
  await stopProcess(child, 'frontend');
}

async function restartBot() {
  if (isRestarting) return;
  isRestarting = true;

  console.log('[dev] Restarting bot...');
  await stopBot();
  isRestarting = false;
  startBot();
}

async function shutdown() {
  if (isRestarting) return;
  isRestarting = true;
  console.log('[dev] Shutting down...');

  const forceExit = setTimeout(() => {
    console.error('[dev] Forced exit after timeout');
    process.exit(1);
  }, 8000);

  await Promise.all([stopBot(), stopVite()]);
  clearTimeout(forceExit);
  process.exit(0);
}

async function main() {
  const dashboardPort = Number(process.env.DASHBOARD_PORT) || DEFAULT_DASHBOARD_PORT;

  const killedVite = freePort(VITE_PORT, 'frontend');
  const killedBot = freePort(dashboardPort, 'dashboard');
  if (killedVite || killedBot) await sleep(200);

  startVite();
  startBot();
}

main();

process.stdin.on('data', (data) => {
  const input = data.toString().trim();
  if (input === 'r' || input === 'restart') {
    restartBot();
  } else if (input === 'q' || input === 'quit') {
    console.log('[dev] Quitting...');
    shutdown();
  }
});

console.log('[dev] Commands:');
console.log('  r / restart - Restart bot');
console.log('  q / quit    - Stop and exit');

process.on('SIGINT', () => {
  shutdown();
});

process.on('SIGTERM', () => {
  shutdown();
});
