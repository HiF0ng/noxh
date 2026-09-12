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
const field = (label, value) => value ? `<div class="project-fact"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>` : '';

function projectPage(project, { origin }) {
  const slug = project.slug || slugifyProject(project.title);
  const pathname = `/du-an/${encodeURIComponent(slug)}`;
  const canonical = origin ? `${origin}${pathname}` : pathname;
  const details = project.details_json || {};
  const description = descriptionFor(project);
  const image = safeImage(details.mainImageUrl || details.imageUrl) || (origin ? `${origin}/img/CoverFB.jpg` : '/img/CoverFB.jpg');
  const address = details.address || project.location;
  const facts = [field('Vị trí', address), field('Chủ đầu tư', project.investor), field('Trạng thái', project.status), field('Quy mô', details.scale), field('Diện tích', details.area), field('Bàn giao', details.handover)].filter(Boolean).join('');
  const pageJsonLd = {
    '@context': 'https://schema.org', '@type': 'WebPage', name: project.title, description,
    url: canonical, primaryImageOfPage: image,
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: origin ? `${origin}/trang-chu` : '/trang-chu' },
      { '@type': 'ListItem', position: 2, name: 'Dự án', item: origin ? `${origin}/du-an` : '/du-an' },
      { '@type': 'ListItem', position: 3, name: project.title, item: canonical }
    ] }
  };
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(project.title)} | NOXH.help</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="index, follow, max-image-preview:large"><link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="website"><meta property="og:locale" content="vi_VN"><meta property="og:title" content="${escapeHtml(project.title)} | NOXH.help"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:image" content="${escapeHtml(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(project.title)} | NOXH.help"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(image)}">
<link rel="stylesheet" href="/assets/css/style.css?v=34"><style>body{margin:0;background:#f7faf8;color:#183f35;font-family:Arial,sans-serif}.project-header{display:flex;justify-content:space-between;align-items:center;padding:18px 6vw;background:#fff;border-bottom:1px solid #dce9e4}.project-header a{color:#0d6b56;font-weight:700;text-decoration:none}.project-header nav{display:flex;gap:20px}.project-hero{padding:52px 6vw 42px;background:linear-gradient(135deg,#e5f4ed,#fff)}.project-wrap{max-width:1100px;margin:auto}.project-crumb{margin:0 0 22px;color:#5d756b;font-size:14px}.project-crumb a{color:#0d6b56;text-decoration:none}.project-hero h1{max-width:850px;margin:0;color:#133d32;font-size:clamp(30px,5vw,52px);line-height:1.13}.project-hero p{max-width:720px;margin:20px 0 0;color:#526e63;line-height:1.7}.project-content{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:28px;padding:42px 6vw 70px}.project-panel{padding:28px;background:#fff;border:1px solid #dce9e4;border-radius:18px}.project-panel h2{margin-top:0;color:#133d32}.project-facts{margin:0}.project-fact{padding:14px 0;border-bottom:1px solid #edf3f0}.project-fact:last-child{border:0}.project-fact dt{font-size:13px;color:#648076}.project-fact dd{margin:4px 0 0;font-weight:700;color:#234b3e}@media(max-width:760px){.project-header nav{display:none}.project-content{grid-template-columns:1fr;padding:28px 5vw 48px}.project-hero{padding:38px 5vw}.project-panel{padding:22px}}</style>
<script type="application/ld+json">${escapeJson(pageJsonLd)}</script></head><body>
<header class="project-header"><a href="/trang-chu">NOXH.help</a><nav aria-label="Điều hướng"><a href="/du-an">Dự án</a><a href="/tai-lieu">Tài liệu</a><a href="/lien-he">Liên hệ</a></nav></header>
<main><section class="project-hero"><div class="project-wrap"><p class="project-crumb"><a href="/trang-chu">Trang chủ</a> / <a href="/du-an">Dự án</a> / ${escapeHtml(project.title)}</p><h1>${escapeHtml(project.title)}</h1><p>${escapeHtml(description)}</p></div></section><section class="project-content project-wrap"><article class="project-panel"><h2>Tổng quan dự án</h2><p>${escapeHtml(String(details.desc || project.description || project.desc || 'Thông tin chi tiết đang được cập nhật.')).replace(/\n/g, '<br>')}</p></article><aside class="project-panel"><h2>Thông tin</h2><dl class="project-facts">${facts || '<div class="project-fact"><dd>Đang cập nhật</dd></div>'}</dl></aside></section></main>
</body></html>`;
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
    await writeFile(target, projectPage({ ...project, slug }, { origin }), 'utf8');
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
