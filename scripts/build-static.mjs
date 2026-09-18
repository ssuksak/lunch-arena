import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { buildSync } from 'esbuild';

const root = process.cwd();
const outDir = join(root, 'dist');
const files = [
  'index.html',
  'community.css',
  'community.js',
  'lucide.min.js',
  'ait-bridge.js',
  'privacy.html',
  'icon_600.png',
  'icon.png',
  'icon.svg',
  'thumbnail_1932x828.png'
];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

buildSync({
  entryPoints: [join(root, 'scripts/ait-bridge-entry.js')],
  outfile: join(root, 'ait-bridge.js'),
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['safari15', 'chrome100'],
});

for (const file of files) {
  cpSync(join(root, file), join(outDir, file));
}

cpSync(join(root, 'migrations'), join(outDir, 'migrations'), { recursive: true });
