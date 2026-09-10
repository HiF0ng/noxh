import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist', 'public');
const manifest = JSON.parse(await readFile(path.join(root, 'dist', 'build-manifest.json'), 'utf8'));
const forbiddenPath = /(?:^|\/)(?:\.git|server|planning)(?:\/|$)|(?:^|\/)\.env(?:\.|$)|(?:^|\/)(?:database|data)\.json$|\.(?:sql|log|exe|dll|pdb)$/i;
const forbiddenContent = /\bsb_secret_[A-Za-z0-9_-]+\b|\bSUPABASE_SERVICE_ROLE\b|\bservice_role\b|\bJWT_SECRET\s*=/;

if (!Array.isArray(manifest.files) || !manifest.files.length) throw new Error('Missing or empty public build manifest.');
for (const entry of manifest.files) {
  if (forbiddenPath.test(entry.path)) throw new Error(`Forbidden artifact path: ${entry.path}`);
  const file = path.resolve(output, entry.path);
  if (!file.startsWith(`${output}${path.sep}`)) throw new Error(`Unsafe manifest path: ${entry.path}`);
  const body = await readFile(file);
  const digest = createHash('sha256').update(body).digest('hex');
  if (digest !== entry.sha256 || body.length !== entry.bytes) throw new Error(`Artifact integrity mismatch: ${entry.path}`);
  if (/\.(?:html|css|js)$/i.test(entry.path) && forbiddenContent.test(body.toString('utf8'))) {
    throw new Error(`Forbidden secret marker in artifact: ${entry.path}`);
  }
}
for (const entry of [...manifest.publicEntries, ...manifest.privateEntries]) {
  await stat(path.join(output, entry));
}
console.log(`Verified ${manifest.files.length} public-build files; no restricted paths or secret markers found.`);
