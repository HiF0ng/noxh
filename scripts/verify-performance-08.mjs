import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const htmlFiles = (await readdir(root)).filter(name => name.endsWith('.html'));
const generatedCss = path.join(root, 'assets', 'css', 'tailwind.generated.css');
const generatedCssText = await readFile(generatedCss, 'utf8').catch(() => '');

if (!generatedCssText) failures.push('Missing assets/css/tailwind.generated.css. Run npm run build:css.');
if (generatedCssText.length > 750_000) failures.push('Generated Tailwind CSS is unexpectedly large; check the content scan paths.');
for (const requiredClass of ['.bg-primary', '.status-pill', '.lg\\:flex']) {
  if (!generatedCssText.includes(requiredClass)) failures.push(`Generated CSS is missing ${requiredClass}.`);
}

for (const file of htmlFiles) {
  const html = await readFile(path.join(root, file), 'utf8');
  if (/cdn\.tailwindcss\.com|assets\/js\/tailwind-config\.js/.test(html)) failures.push(`${file} still loads Tailwind at runtime.`);
  if (!/assets\/css\/tailwind\.generated\.css\?v=1/.test(html)) failures.push(`${file} does not load the generated Tailwind CSS.`);
}

const details = await readFile(path.join(root, 'details.html'), 'utf8');
if (!/id="detail-hero-image"[^>]*loading="eager"[^>]*fetchpriority="high"[^>]*decoding="async"/.test(details)) {
  failures.push('The project-detail hero is missing eager/high-priority image loading.');
}
if (!/id="detail-floorplan-image"[^>]*loading="lazy"[^>]*decoding="async"/.test(details)) {
  failures.push('The project floor plan is missing lazy/asynchronous image decoding.');
}

const main = await readFile(path.join(root, 'assets', 'js', 'main.js'), 'utf8');
if (!/width="640" height="400" loading="lazy" decoding="async"/.test(main)) failures.push('Project cards are missing lazy-load dimensions.');
if (!/width="1600" height="2200" loading="lazy" decoding="async"/.test(main)) failures.push('Document preview pages are missing lazy-load dimensions.');

const admin = await readFile(path.join(root, 'assets', 'js', 'admin.js'), 'utf8');
for (const fragment of [
  'async function optimizeProjectImageForUpload',
  "main: { maxEdge: 1920, quality: 0.84 }",
  "gallery: { maxEdge: 1600, quality: 0.82 }",
  "floorplans: { maxEdge: 2560, quality: 0.94 }",
  "canvas.toBlob(resolve, 'image/webp', profile.quality)",
  'blob.size >= file.size * 0.9'
]) {
  if (!admin.includes(fragment)) failures.push(`Missing image-upload safeguard: ${fragment}`);
}

const cssSize = (await stat(generatedCss)).size;
if (failures.length) {
  console.error(failures.map(item => `FAIL: ${item}`).join('\n'));
  process.exit(1);
}
console.log(`Performance 08 checks passed: ${htmlFiles.length} HTML files use built Tailwind CSS (${Math.round(cssSize / 1024)} KiB).`);
