import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('assets/js/supabase-service.js', 'utf8');
const mainSource = fs.readFileSync('assets/js/main.js', 'utf8');
const adminSource = fs.readFileSync('assets/js/admin.js', 'utf8');
const migration = fs.readFileSync('supabase_migrations/20260910_05b_security_hardening.sql', 'utf8');
const groupingMigration = fs.readFileSync('supabase_migrations/20260911_document_storage_grouping.sql', 'utf8');
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
  console: { ...console, error() {} },
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

const legalReference = await service.uploadDocumentFile({ name: 'Nghị định.pdf', type: 'application/pdf' }, 'legal');
assert.match(legalReference, /^storage:\/\/private-documents\/documents\/legal\//, 'Legal documents must use the private legal folder');
const packageReference = await service.uploadDocumentFile({ name: 'bo-tai-lieu.zip', type: 'application/zip' }, 'packages');
assert.match(packageReference, /^storage:\/\/private-documents\/documents\/packages\//, 'Document packages must use the private packages folder');
const guideReference = await service.uploadDocumentFile({ name: 'huong-dan.png', type: 'image/png' }, 'guides');
assert.match(guideReference, /^storage:\/\/private-documents\/documents\/guides\//, 'Guide images must use the private guides folder');
assert.equal(await service.uploadDocumentFile({ name: 'bad.pdf', type: 'application/pdf' }, 'unknown'), null, 'Unknown document storage groups must be rejected');
const requestCountBeforeLegacyWrite = requests.length;
assert.equal(await service.addDocument({ name: 'Legacy document', type: 'Đơn đăng ký', file: 'https://example.supabase.co/storage/v1/object/public/project-images/documents/forms/legacy.pdf' }), null, 'Document records must reject public Storage URLs');
assert.equal(requests.length, requestCountBeforeLegacyWrite, 'A rejected public document URL must never reach the database');

const signedUrl = await service.createPrivateDocumentDownloadUrl(privateReference, 'don-dang-ky.pdf');
assert.match(signedUrl, /^https:\/\/example\.supabase\.co\/storage\/v1\/object\/sign\/private-documents\//, 'Private download must use a signed Storage URL');
const signRequest = requests.at(-1);
assert.equal(signRequest.options.headers.Authorization, 'Bearer test-token', 'Signing must require the authenticated session');
assert.equal(JSON.parse(signRequest.options.body).expiresIn, 60, 'Signed URLs must be short lived');

assert.match(mainSource, /data-private-document-reference/, 'Document UI must route private references through the signed download handler');
assert.match(mainSource, /createPrivateDocumentDownloadUrl/, 'Document UI must request a signed URL before download');
assert.match(mainSource, /\(documents \|\| \[\]\)\.filter\(document => !document\.isDraft && document\.type === category\)/, 'Package buttons must keep their category mapping');
assert.match(mainSource, /createPrivateDocumentDownloadUrl\(reference, getDocumentDownloadName\(packageFile\)\)/, 'Package downloads must sign private references');
assert.match(adminSource, /legalDocumentCategory = 'Văn bản luật'/, 'Admin must expose the legal-document category rule');
assert.match(adminSource, /Văn bản pháp luật cần có tệp PDF/, 'Admin must require PDF for published legal documents');
assert.match(adminSource, /createPrivateDocumentDownloadUrl\(url, downloadName\)/, 'Admin edit links must sign private documents');
assert.match(adminSource, /createPrivateDocumentDownloadUrl\(item\.url\)/, 'Admin guide previews must sign private images');
assert.match(migration, /USING \(is_draft = false\)/, 'Migration must keep draft projects and documents out of public reads');
assert.match(migration, /VALUES \('private-documents', 'private-documents', false\)/, 'Migration must create a private document bucket');
assert.match(migration, /Private document read for authenticated users/, 'Migration must allow only authenticated document downloads');
assert.doesNotMatch(migration, /CREATE POLICY "Anon full access/, 'Migration must not create anonymous full-access policies');
assert.doesNotMatch(bootstrapSchema, /CREATE POLICY "Anon full access/, 'Bootstrap schema must not reintroduce anonymous full access');
assert.match(groupingMigration, /documents_private_storage_group_check/, 'Grouping migration must install the database constraint');
assert.match(groupingMigration, /WHEN document_category = 'Văn bản luật' THEN 'legal'/, 'Database must map legal documents to the legal folder');
assert.match(groupingMigration, /WHEN document_category LIKE 'Bộ tài liệu - %' THEN 'packages'/, 'Database must map document packages to the packages folder');
assert.match(groupingMigration, /WHEN document_category = 'Hướng dẫn' THEN 'guides'/, 'Database must map guide images to the guides folder');
assert.match(groupingMigration, /SET\s+file_url = regexp_replace/, 'Grouping migration must convert legacy main-file URLs as well as metadata URLs');

console.log('05B security contract checks passed.');
