#!/usr/bin/env bun

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const webDir = join(projectRoot, 'web');

function runCommand(cmd: string, args: string[], cwd?: string) {
  return new Promise<number>((resolvePromise) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit' });
    child.on('error', () => resolvePromise(1));
    child.on('exit', (code) => resolvePromise(code ?? 1));
  });
}

async function ensureWebDeps(): Promise<void> {
  try {
    if (!existsSync(webDir)) return;
    const nodeModules = join(webDir, 'node_modules');
    if (existsSync(nodeModules)) return;

    console.log('[start] web/node_modules not found — installing web dependencies...');
    const rc = await runCommand('bun', ['install'], webDir);
    if (rc !== 0) {
      console.warn('[start] web dependency installation failed (non-zero exit). Continuing to start bot.');
    } else {
      console.log('[start] web dependencies installed');
    }
  } catch (error) {
    console.warn('[start] Failed to auto-install web deps:', error);
  }
}

async function startBot(): Promise<number> {
  // Run the bundled entry
  return runCommand('bun', ['run', 'dist/index.js'], projectRoot);
}

async function main() {
  await ensureWebDeps();
  const code = await startBot();
  process.exit(code);
}

main();
