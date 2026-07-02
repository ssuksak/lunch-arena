import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outDir = join(root, 'dist');
const files = [
  'index.html',
  'privacy.html',
  'icon_600.png',
  'icon.png',
  'icon.svg',
  'thumbnail_1932x828.png'
];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const file of files) {
  cpSync(join(root, file), join(outDir, file));
}

cpSync(join(root, 'migrations'), join(outDir, 'migrations'), { recursive: true });
