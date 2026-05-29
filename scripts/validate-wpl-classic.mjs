// One-shot validator: decode wpl-classic.cm25skin and assert it passes the
// runtime skin schema. Catches "skin too big" / "asset over budget" errors
// without needing a browser.

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { inflateSync } from 'zlib';
import { validateSkinPack, getPackSizeBytes, SIZE_BUDGETS } from '../src/data/schemas/skinSchema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PACK_PATH = path.join(REPO_ROOT, 'public', 'skins', 'official', 'wpl-classic.cm25skin');

const encoded = await fs.readFile(PACK_PATH, 'utf-8');
const compressed = Buffer.from(encoded, 'base64');
const json = inflateSync(compressed).toString('utf-8');
const pack = JSON.parse(json);

const result = validateSkinPack(pack);
const totalBytes = getPackSizeBytes(pack);

console.log(`pack: ${pack.skin?.id} v${pack.skin?.version} (${pack.skin?.name})`);
console.log(`teams: ${Object.keys(pack.teams || {}).length}`);
console.log(`total raw asset bytes: ${(totalBytes / 1024 / 1024).toFixed(2)} MB / ${SIZE_BUDGETS.TOTAL / 1024 / 1024} MB budget`);
console.log(`compressed file: ${(encoded.length / 1024).toFixed(1)} KB`);
console.log(`validation: ${result.valid ? '✅ PASS' : '❌ FAIL — ' + result.reason}`);
if (result.warnings?.length) {
  console.log(`warnings: ${result.warnings.join(', ')}`);
}

if (!result.valid) process.exit(1);
