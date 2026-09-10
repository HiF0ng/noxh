import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(root, 'dist', 'public');
const outputPrefix = `${path.resolve(root, 'dist')}${path.sep}`;
if (!output.startsWith(outputPrefix)) throw new Error('Refusing to write outside dist/.');

const publicEntries = [
  'about_us.html', 'all-projects.html', 'compare.html', 'contact.html', 'details.html',
  'docs-guide.html', 'documents.html', 'faq.html', 'guide.html', 'homepage.html',
  'loan.html', 'login.html', 'policy.html', 'recover-password.html', 'register_steps.html',
  'saved.html', 'settings.html', 'signup.html', 'term_of_use.html', 'working.html'
];
const privateEntries = ['admin.html', 'admin-login.html'];
const rootFiles = [...publicEntries, ...privateEntries, 'components/navbar.html', 'components/footer.html', 'LogoIcon'];
const copied = new Set();
const queue = [...rootFiles];

const isLocal = value => value
  && !value.startsWith('#')
  && !/^(?:https?:|data:|mailto:|tel:|javascript:|\/\/)/i.test(value);

function toRelative(value, parent) {
  const withoutQuery = value.split(/[?#]/, 1)[0].replace(/^\/+/, '');
  const resolved = value.startsWith('/') ? withoutQuery : path.posix.normalize(path.posix.join(path.posix.dirname(parent), withoutQuery));
  if (resolved === '..' || resolved.startsWith('../')) throw new Error(`Unsafe asset reference: ${value} from ${parent}`);
  return resolved;
}

function dependencies(source, from) {
  const values = [];
  for (const match of source.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) values.push(match[1]);
  for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) values.push(match[1]);
  // Navbar/footer are fetched then inserted into the document, so their relative
  // URLs resolve against the document URL (and its <base>), not components/.
  const resolutionBase = from.startsWith('components/') ? '' : from;
  return values.filter(isLocal).map(value => toRelative(value, resolutionBase));
}

async function copy(relative) {
  if (copied.has(relative)) return;
  const source = path.resolve(root, relative);
  const allowedPrefix = `${root}${path.sep}`;
  if (!source.startsWith(allowedPrefix)) throw new Error(`Refusing source outside repository: ${relative}`);
  let fileStat;
  try { fileStat = await stat(source); } catch { throw new Error(`Missing allowlisted asset: ${relative}`); }
  if (!fileStat.isFile()) throw new Error(`Expected a file: ${relative}`);
  const target = path.resolve(output, relative);
  if (!target.startsWith(`${output}${path.sep}`)) throw new Error(`Unsafe output path: ${relative}`);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { force: true });
  copied.add(relative);
  const extension = path.extname(relative).toLowerCase();
  if (!['.html', '.css'].includes(extension)) return;
  const text = await readFile(source, 'utf8');
  for (const dependency of dependencies(text, relative)) {
    if (/^(?:assets|components|img)\//.test(dependency) || dependency === 'LogoIcon') queue.push(dependency);
  }
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
while (queue.length) await copy(queue.shift());

const files = [];
for (const relative of [...copied].sort()) {
  const body = await readFile(path.join(output, relative));
  files.push({ path: relative, bytes: body.length, sha256: createHash('sha256').update(body).digest('hex') });
}
const report = {
  format: 1,
  publicEntries,
  privateEntries,
  files
};
await mkdir(path.join(root, 'dist'), { recursive: true });
await writeFile(path.join(root, 'dist', 'build-manifest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Built ${files.length} allowlisted files in dist/public.`);
