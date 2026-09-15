import assert from 'node:assert/strict';
import fs from 'node:fs';

const siteOrigin = (process.env.NOXH_SITE_URL || 'https://noxh.help').replace(/\/$/, '');
const configSource = fs.readFileSync('assets/js/supabase-config.js', 'utf8');
const supabaseUrl = configSource.match(/url:\s*['"]([^'"]+)['"]/)?.[1];
const publishableKey = configSource.match(/anonKey:\s*['"]([^'"]+)['"]/)?.[1];
assert.ok(supabaseUrl && publishableKey, 'Missing public Supabase configuration.');

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const siteCases = [
  ['/trang-chu', 200],
  ['/khong-ton-tai', 404],
  ['/.env', 404],
  ['/.git/config', 404],
  ['/server/.env', 404],
  ['/supabase_schema.sql', 404]
];
for (const [path, expectedStatus] of siteCases) {
  const response = await fetchWithTimeout(`${siteOrigin}${path}`, { redirect: 'manual' });
  assert.equal(response.status, expectedStatus, `${path} returned ${response.status}; expected ${expectedStatus}`);
}

const apiHeaders = {
  apikey: publishableKey,
  Authorization: `Bearer ${publishableKey}`,
  'Content-Type': 'application/json'
};
const readJson = async response => {
  const body = await response.text();
  try { return JSON.parse(body); } catch { return body; }
};

for (const table of ['projects', 'documents']) {
  const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${table}?is_draft=eq.true&select=id&limit=1`, { headers: apiHeaders });
  assert.equal(response.status, 200, `Anonymous ${table} draft probe failed with ${response.status}.`);
  assert.deepEqual(await readJson(response), [], `Anonymous users can read draft rows from ${table}.`);
}

for (const table of ['users', 'user_saved_projects', 'user_followed_projects']) {
  const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, { headers: apiHeaders });
  if (response.status === 200) {
    assert.deepEqual(await readJson(response), [], `Anonymous users can read rows from ${table}.`);
  } else {
    assert.ok([401, 403].includes(response.status), `Anonymous ${table} read returned unexpected status ${response.status}.`);
  }
}

const privateListResponse = await fetchWithTimeout(`${supabaseUrl}/storage/v1/object/list/private-documents`, {
  method: 'POST',
  headers: apiHeaders,
  body: JSON.stringify({ prefix: '', limit: 1, offset: 0 })
});
assert.equal(privateListResponse.status, 200, `Private bucket list probe failed with ${privateListResponse.status}.`);
assert.deepEqual(await readJson(privateListResponse), [], 'Anonymous users can list private document objects.');

const wwwResponse = await fetchWithTimeout(`https://www.noxh.help/trang-chu`, { redirect: 'manual' });
assert.equal(wwwResponse.status, 301, 'www host must use a permanent redirect.');
assert.equal(wwwResponse.headers.get('location'), `${siteOrigin}/trang-chu`, 'www redirect must stay on HTTPS.');

console.log('Production security probes passed: HTTPS routes, sensitive paths, draft RLS, private tables and private Storage.');
