import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('assets/js/supabase-service.js', 'utf8');
const mainSource = fs.readFileSync('assets/js/main.js', 'utf8');
const migration = fs.readFileSync('supabase_migrations/20260910_05b_security_hardening.sql', 'utf8');
const bootstrapSchema = fs.readFileSync('supabase_schema.sql', 'utf8');
const memory = new Map([['noxh_auth_session', JSON.stringify({ access_token: 'test-token' })]]);
const requests = [];
const storage = {
  getItem(key) { return memory.get(key) || null; },
  setItem(key, value) { memory.set(key, value); },
  removeItem(key) { memory.delete(key); }
};
const context = {
  window: {
    SUPABASE_CONFIG: { url: 'https://example.supabase.co', anonKey: 'publishable-test-key' },
    localStorage: storage,
    sessionStorage: storage
  },
  localStorage: storage,
  sessionStorage: storage,
  console,
  fetch: async (url, options = {}) => {
    requests.push({ url, options });
    if (String(url).includes('/object/sign/private-documents/')) {
      return { ok: true, json: async () => ({ signedURL: '/object/sign/private-documents/a.pdf?token=test' }) };
    }
    return { ok: true, json: async () => ([{ id: 'record-id' }]), text: async () => '' };
  },
  setTimeout,
  clearTimeout
};
context.window.window = context.window;
vm.runInNewContext(source, context, { filename: 'supabase-service.js' });

const service = context.window.SupabaseService;
assert.ok(service, 'SupabaseService must initialize');
assert.equal(typeof service.resetPasswordByEmail, 'undefined', 'Legacy profile password reset must not exist');
assert.equal(typeof service.addUser, 'undefined', 'Client must not create profile rows with a default password');

await service.addProject({
  name: 'Draft project',
  details: { desc: 'test', isDraft: true },
  isDraft: true
});
const projectRequest = requests.at(-1);
const projectPayload = JSON.parse(projectRequest.options.body);
assert.equal(projectPayload.is_draft, true, 'Project draft state must be written to its SQL column');
assert.equal(Object.hasOwn(projectPayload.details_json, 'isDraft'), false, 'Draft state must not be persisted in JSON');

await service.getProjects();
assert.doesNotMatch(requests.at(-1).url, /projects\?select=\*/, 'Public project reads must not request every database column');
await service.getDocuments();
assert.doesNotMatch(requests.at(-1).url, /documents\?select=\*/, 'Public document reads must not request every database column');

const privateReference = await service.uploadDocumentFile({ name: 'Đơn đăng ký.pdf', type: 'application/pdf' }, 'forms');
assert.match(privateReference, /^storage:\/\/private-documents\/documents\/forms\//, 'New document files must use the private bucket reference');
assert.match(requests.at(-1).url, /\/storage\/v1\/object\/private-documents\//, 'Document upload must target the private bucket');

const signedUrl = await service.createPrivateDocumentDownloadUrl(privateReference, 'don-dang-ky.pdf');
assert.match(signedUrl, /^https:\/\/example\.supabase\.co\/storage\/v1\/object\/sign\/private-documents\//, 'Private download must use a signed Storage URL');
const signRequest = requests.at(-1);
assert.equal(signRequest.options.headers.Authorization, 'Bearer test-token', 'Signing must require the authenticated session');
assert.equal(JSON.parse(signRequest.options.body).expiresIn, 60, 'Signed URLs must be short lived');

assert.match(mainSource, /data-private-document-reference/, 'Document UI must route private references through the signed download handler');
assert.match(mainSource, /createPrivateDocumentDownloadUrl/, 'Document UI must request a signed URL before download');
assert.match(migration, /USING \(is_draft = false\)/, 'Migration must keep draft projects and documents out of public reads');
assert.match(migration, /VALUES \('private-documents', 'private-documents', false\)/, 'Migration must create a private document bucket');
assert.match(migration, /Private document read for authenticated users/, 'Migration must allow only authenticated document downloads');
assert.doesNotMatch(migration, /CREATE POLICY "Anon full access/, 'Migration must not create anonymous full-access policies');
assert.doesNotMatch(bootstrapSchema, /CREATE POLICY "Anon full access/, 'Bootstrap schema must not reintroduce anonymous full access');

console.log('05B security contract checks passed.');
