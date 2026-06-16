import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.html', '.json', '.css', '.md']);
const excludeDirs = new Set(['node_modules', 'dist', '.git', 'scripts']);

const replacements = [
  ['\u00C3\u00A9', '\u00E9'],
  ['\u00C3\u00A8', '\u00E8'],
  ['\u00C3\u00AA', '\u00EA'],
  ['\u00C3\u00AB', '\u00EB'],
  ['\u00C3\u00A7', '\u00E7'],
  ['\u00C3\u0089', '\u00C9'],
  ['\u00C3\u0080', '\u00C0'],
  ['\u00C3\u00A0', '\u00E0'],
  ['\u00C3\u00A2', '\u00E2'],
  ['\u00C3\u00B4', '\u00F4'],
  ['\u00C3\u00BB', '\u00FB'],
  ['\u00C3\u00B9', '\u00F9'],
  ['\u00C3\u00AE', '\u00EE'],
  ['\u00C3\u00AF', '\u00EF'],
  ['\u00C3\u00BC', '\u00FC'],
  ['\u00C3\u0082', '\u00C2'],
  ['\u00E2\u20AC\u2122', '\u2019'],
  ['\u00E2\u20AC\u0153', '\u201C'],
  ['\u00E2\u20AC\u009D', '\u201D'],
  ['\u00E2\u20AC\u201D', '\u2014'],
  ['\u00E2\u20AC\u2013', '\u2013'],
  ['\u00E2\u20AC\u00A6', '\u2026'],
];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (excludeDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const files = await walk(rootDir);
  let changed = 0;

  for (const file of files) {
    const original = await fs.readFile(file, 'utf8');
    let updated = original;
    for (const [bad, good] of replacements) {
      updated = updated.split(bad).join(good);
    }

    if (updated !== original) {
      await fs.writeFile(file, updated, 'utf8');
      changed += 1;
      console.log(`fixed ${path.relative(rootDir, file)}`);
    }
  }

  console.log(`done: ${changed} file(s) updated`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
