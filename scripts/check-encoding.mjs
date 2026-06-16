import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const targets = [path.join(rootDir, 'src'), path.join(rootDir, 'index.html')];
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.html', '.json', '.css']);
const skipDirs = new Set(['node_modules', 'dist', '.git', 'scripts']);
const badChars = /(Ã|Â|ðŸ|â€”|â€™|â€œ|â€)/;

async function walk(entryPath, results = []) {
  const stat = await fs.stat(entryPath);
  if (stat.isDirectory()) {
    const entries = await fs.readdir(entryPath, { withFileTypes: true });
    for (const entry of entries) {
      if (skipDirs.has(entry.name)) continue;
      await walk(path.join(entryPath, entry.name), results);
    }
    return results;
  }

  if (extensions.has(path.extname(entryPath)) || path.basename(entryPath) === 'index.html') {
    results.push(entryPath);
  }
  return results;
}

async function main() {
  const files = [];
  for (const target of targets) {
    await walk(target, files);
  }

  const matches = [];
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    if (badChars.test(content)) {
      matches.push(path.relative(rootDir, file));
    }
  }

  if (matches.length > 0) {
    console.log(matches.join('\n'));
    process.exitCode = 1;
    return;
  }

  console.log('No broken encoding markers found.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
