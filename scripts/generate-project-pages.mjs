import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const escapeJson = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
const escapeXml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export const slugifyProject = value => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'du-an';

const safeImage = value => /^https:\/\//i.test(String(value || '')) ? String(value) : null;
const descriptionFor = project => String(project.details_json?.desc || project.description || project.desc || '')
  .replace(/\s+/g, ' ').trim().slice(0, 180) || `Thông tin dự án ${project.title}.`;

const normalizeProjectStatus = status => {
  if (status === 'Chờ bàn giao' || status === 'Đã bàn giao') return 'Bàn giao';
  if (status === 'Đang nhận đơn') return 'Đang nhận hồ sơ';
  return status;
};

const clientProjectFor = project => {
  const details = project.details_json || {};
  return {
    id: project.id,
    name: project.title,
    location: project.location,
    owner: project.investor,
    status: normalizeProjectStatus(project.status),
    progress: project.progress,
    projectCode: details.projectCode || '',
    desc: details.desc || '',
    imageUrl: details.mainImageUrl || '',
    price: details.price || 'Từ 15tr/m²',
    investor: project.investor,
    scale: details.scale || 'Đang cập nhật',
    area: details.area || 'Đang cập nhật',
    handover: details.handover || 'Đang cập nhật',
    slug: project.slug || slugifyProject(project.title),
    previousSlugs: Array.isArray(project.previous_slugs) ? project.previous_slugs : [],
    updated_at: project.updated_at || project.created_at,
    details: { ...details, isDraft: false }
  };
};

const replaceElementText = (html, id, value) => html.replace(
  new RegExp(`(<([a-z][\\w:-]*)[^>]+id=["']${id}["'][^>]*>)[\\s\\S]*?(<\\/\\2>)`, 'i'),
  `$1${escapeHtml(value)}$3`
);

function projectPage(project, { origin, template }) {
  const slug = project.slug || slugifyProject(project.title);
  const pathname = `/du-an/${encodeURIComponent(slug)}`;
  const canonical = origin ? `${origin}${pathname}` : pathname;
  const details = project.details_json || {};
  const description = descriptionFor(project);
  const image = safeImage(details.mainImageUrl || details.imageUrl) || (origin ? `${origin}/img/CoverFB.jpg` : '/img/CoverFB.jpg');
  const clientProject = clientProjectFor({ ...project, slug });
  const pageJsonLd = {
    '@context': 'https://schema.org', '@type': 'WebPage', name: project.title, description,
    url: canonical, primaryImageOfPage: image,
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: origin ? `${origin}/trang-chu` : '/trang-chu' },
      { '@type': 'ListItem', position: 2, name: 'Dự án', item: origin ? `${origin}/du-an` : '/du-an' },
      { '@type': 'ListItem', position: 3, name: project.title, item: canonical }
    ] }
  };
  const seo = `<!-- SEO:START -->
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="vi_VN">
<meta property="og:title" content="${escapeHtml(project.title)} | NOXH.help">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(project.title)} | NOXH.help">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<!-- SEO:END -->`;
  const preload = `<script>window.__NOXH_PRELOADED_PROJECT__=${escapeJson(clientProject)};<\/script>`;
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(project.title)} | NOXH.help</title>`)
    .replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/i, seo)
    .replace(/<script src="assets\/js\/seo\.js\?v=\d+"><\/script>/i, `${preload}\n  <script src="assets/js/seo.js?v=2"></script>`)
    .replace(/assets\/js\/main\.js\?v=\d+/i, 'assets/js/main.js?v=100')
    .replace('</head>', `<script type="application/ld+json">${escapeJson(pageJsonLd)}</script></head>`);
  html = replaceElementText(html, 'detail-title', project.title);
  html = replaceElementText(html, 'detail-breadcrumb-title', project.title);
  html = replaceElementText(html, 'detail-location', details.address || project.location || 'Đang cập nhật');
  html = replaceElementText(html, 'detail-desc', details.desc || 'Đang cập nhật thông tin dự án.');
  return html;
}

async function readPublicConfig(root) {
  const source = await readFile(path.join(root, 'assets', 'js', 'supabase-config.js'), 'utf8');
  const url = source.match(/url:\s*'([^']+)'/)?.[1];
  const anonKey = source.match(/anonKey:\s*'([^']+)'/)?.[1];
  if (!url || !anonKey) throw new Error('Cannot read the public Supabase build configuration.');
  return { url, anonKey };
}

export async function fetchPublishedProjects(root) {
  if (process.env.NOXH_PROJECTS_FIXTURE) return JSON.parse(await readFile(path.resolve(root, process.env.NOXH_PROJECTS_FIXTURE), 'utf8'));
  const configured = await readPublicConfig(root);
  const url = process.env.NOXH_SUPABASE_URL || configured.url;
  const anonKey = process.env.NOXH_SUPABASE_ANON_KEY || configured.anonKey;
  const select = 'id,title,slug,previous_slugs,location,investor,progress,status,is_draft,details_json,created_at,updated_at';
  const endpoint = `${url}/rest/v1/projects?is_draft=eq.false&select=${select}`;
  let failure;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(endpoint, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
      if (response.ok) return response.json();
      failure = new Error(`Supabase project export failed (${response.status}).`);
    } catch (error) { failure = error; }
    await new Promise(resolve => setTimeout(resolve, attempt * 350));
  }
  throw failure || new Error('Supabase project export failed.');
}

export async function generateProjectPages({ root, output, origin = '', reportFile = path.join(root, 'dist', 'project-publication-manifest.json') }) {
  const projects = await fetchPublishedProjects(root);
  const detailsTemplate = await readFile(path.join(root, 'details.html'), 'utf8');
  const usedSlugs = new Set();
  const redirects = {};
  const outputFiles = [];
  const sitemapEntries = [];
  for (const project of projects) {
    if (project.is_draft === true) continue;
    const slug = String(project.slug || slugifyProject(project.title));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Invalid project slug: ${slug}`);
    if (usedSlugs.has(slug)) throw new Error(`Duplicate published project slug: ${slug}`);
    usedSlugs.add(slug);
    const relative = path.posix.join('du-an', slug, 'index.html');
    const target = path.join(output, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, projectPage({ ...project, slug }, { origin, template: detailsTemplate }), 'utf8');
    outputFiles.push(relative);
    const lastmod = new Date(project.updated_at || project.created_at || Date.now()).toISOString().slice(0, 10);
    sitemapEntries.push({ route: `/du-an/${encodeURIComponent(slug)}`, lastmod });
    for (const oldSlug of (Array.isArray(project.previous_slugs) ? project.previous_slugs : [])) {
      if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(oldSlug) && oldSlug !== slug && !usedSlugs.has(oldSlug)) redirects[oldSlug] = slug;
    }
  }
  const report = { format: 1, generatedAt: new Date().toISOString(), published: outputFiles.length, redirects, files: outputFiles };
  await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return { outputFiles, sitemapEntries, redirects };
}

export { escapeXml };
