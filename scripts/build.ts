import { existsSync, mkdirSync, rmSync, statSync } from 'fs';
import { join } from 'path';

const DIST_DIR = join(import.meta.dir, '..', 'dist');
const ENTRY = join(import.meta.dir, '..', 'src', 'index.ts');

// Native/unsafe-to-bundle modules that must stay external
const EXTERNAL = [
  'sharp',
  'canvas',
  'sodium-native',
  'bufferutil',
  'utf-8-validate',
  'prism-media',
  '@discordjs/opus',
  '@discordjs/voice',
];

console.log('Cleaning dist...');
if (existsSync(DIST_DIR)) {
  rmSync(DIST_DIR, { recursive: true });
}
mkdirSync(DIST_DIR, { recursive: true });

console.log('Bundling...');
const result = await Bun.build({
  entrypoints: [ENTRY],
  outdir: DIST_DIR,
  target: 'bun',
  minify: true,
  splitting: false,
  sourcemap: 'none',
  external: EXTERNAL,
  naming: '[name].[ext]',
});

if (!result.success) {
  console.error('Build failed:');
  for (const msg of result.logs) {
    console.error(msg);
  }
  process.exit(1);
}

// Report sizes
let totalBytes = 0;
for (const output of result.outputs) {
  const size = output.size;
  totalBytes += size;
  const kb = (size / 1024).toFixed(1);
  console.log(`  ${output.path.split('/').pop()} → ${kb} KB`);
}

const totalKB = (totalBytes / 1024).toFixed(1);
console.log(`\nBuild complete → dist/ (${totalKB} KB total)`);
