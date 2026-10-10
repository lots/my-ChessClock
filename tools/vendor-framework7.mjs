/*!
 * vendor-framework7.mjs - copies the Framework7 distribution out of node_modules
 * into vendor/, which is what the page actually loads.
 *
 *   npm install && npm run vendor
 *
 * Vendoring keeps the app runnable straight from the file system and offline.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FROM = path.join(ROOT, 'node_modules', 'framework7');
const TO = path.join(ROOT, 'vendor', 'framework7');

if (!fs.existsSync(FROM)) {
  console.error('Framework7 is not installed. Run: npm install');
  process.exit(1);
}

fs.mkdirSync(TO, { recursive: true });
for (const file of ['framework7-bundle.min.css', 'framework7-bundle.min.js']) {
  fs.copyFileSync(path.join(FROM, file), path.join(TO, file));
  console.log('vendored ' + path.relative(ROOT, path.join(TO, file)));
}

const version = JSON.parse(fs.readFileSync(path.join(FROM, 'package.json'), 'utf8')).version;
fs.writeFileSync(
  path.join(TO, 'VERSION'),
  'Framework7 ' + version + '\nhttps://framework7.io/\nMIT License\n'
);
console.log('Framework7 ' + version);
