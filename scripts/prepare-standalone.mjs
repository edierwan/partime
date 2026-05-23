import { access, cp, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const standaloneRoot = path.join(root, '.next', 'standalone');
const standaloneNextRoot = path.join(standaloneRoot, '.next');
const sourceStaticDir = path.join(root, '.next', 'static');
const targetStaticDir = path.join(standaloneNextRoot, 'static');
const sourcePublicDir = path.join(root, 'public');
const targetPublicDir = path.join(standaloneRoot, 'public');

await access(standaloneRoot);
await mkdir(standaloneNextRoot, { recursive: true });
await cp(sourceStaticDir, targetStaticDir, { recursive: true, force: true });

if (await exists(sourcePublicDir)) {
  await cp(sourcePublicDir, targetPublicDir, { recursive: true, force: true });
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}