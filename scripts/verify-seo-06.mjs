import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const publicPages = [
  'homepage.html', 'all-projects.html', 'details.html', 'documents.html', 'faq.html', 'compare.html',
  'loan.html', 'contact.html', 'about_us.html', 'policy.html', 'term_of_use.html', 'guide.html'
];
const privatePages = [
  'admin.html', 'admin-dashboard.html', 'admin-docs-guide.html', 'admin-docs-new.html', 'admin-docs.html',
  'admin-faq.html', 'admin-login.html', 'admin-news-new.html', 'admin-news.html', 'admin-prj-new.html',
  'admin-prj.html', 'admin-user.html', 'docs-guide.html', 'login.html', 'recover-password.html',
  'register_steps.html', 'saved.html', 'settings.html', 'signup.html', 'working.html'
];

for (const page of publicPages) {
  const html = await fs.readFile(page, 'utf8');
  assert.match(html, /<title>[^<]+<\/title>/i, `${page} needs a title`);
  assert.match(html, /<meta name="description" content="[^"]+">/i, `${page} needs a description`);
  assert.match(html, /<meta name="robots" content="index, follow, max-image-preview:large">/i, `${page} needs index robots metadata`);
  assert.match(html, /<link rel="canonical" href="\/[^"]*">/i, `${page} needs a canonical path`);
  assert.match(html, /<meta property="og:title" content="[^"]+">/i, `${page} needs Open Graph title`);
  assert.match(html, /<meta name="twitter:card" content="summary">/i, `${page} needs Twitter metadata`);
  assert.match(html, /<script type="application\/ld\+json">\{[\s\S]*"@type":"WebPage"[\s\S]*<\/script>/i, `${page} needs WebPage JSON-LD`);
  assert.match(html, /assets\/js\/seo\.js\?v=1/, `${page} needs runtime canonical updates`);
}

for (const page of privatePages) {
  const html = await fs.readFile(page, 'utf8');
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive">/i, `${page} must not be indexed`);
}

const robots = await fs.readFile('robots.txt', 'utf8');
assert.match(robots, /User-agent: \*/, 'robots.txt needs a crawler policy');
assert.doesNotMatch(robots, /Disallow: \/(?:admin|login|signup|settings|saved)/, 'noindex pages must remain crawlable so bots can read their robots metadata');
const notFound = await fs.readFile('404.html', 'utf8');
assert.match(notFound, /<meta name="robots" content="noindex, nofollow, noarchive">/, '404 page must not be indexed');
assert.match(notFound, /Đường dẫn này không tồn tại/, '404 page needs a useful visitor message');
assert.match(notFound, /data-local-fallback="homepage\.html"/, '404 home link needs a local preview fallback');
assert.match(notFound, /id="navbar-placeholder"/, '404 page must use the shared navbar placeholder');
assert.match(notFound, /id="footer-placeholder"/, '404 page must use the shared footer placeholder');

const seoScript = await fs.readFile('assets/js/seo.js', 'utf8');
assert.match(seoScript, /window\.NoxhSeo = \{ apply, applyProject:/, 'SEO runtime must expose page and project metadata updates');
assert.match(seoScript, /application\/ld\+json/, 'SEO runtime must update JSON-LD');
assert.match(seoScript, /window\.addEventListener\('popstate'/, 'SEO runtime must update on browser history navigation');
assert.match(seoScript, /\/du-an\//, 'SEO runtime must recognize project URLs');
const mainScript = await fs.readFile('assets/js/main.js', 'utf8');
assert.match(mainScript, /window\.NoxhSeo\?\.apply\?\.\(\)/, 'SPA navigation must refresh metadata');

console.log(`SEO 06 static checks passed for ${publicPages.length} public and ${privatePages.length} private pages.`);
