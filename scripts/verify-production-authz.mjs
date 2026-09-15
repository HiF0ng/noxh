import assert from 'node:assert/strict';
import fs from 'node:fs';

const configSource = fs.readFileSync('assets/js/supabase-config.js', 'utf8');
const supabaseUrl = configSource.match(/url:\s*['"]([^'"]+)['"]/)?.[1];
const publishableKey = configSource.match(/anonKey:\s*['"]([^'"]+)['"]/)?.[1];
assert.ok(supabaseUrl && publishableKey, 'Missing public Supabase configuration.');

const requiredEnvironment = [
  'NOXH_USER_A_EMAIL', 'NOXH_USER_A_PASSWORD',
  'NOXH_USER_B_EMAIL', 'NOXH_USER_B_PASSWORD',
  'NOXH_ADMIN_EMAIL', 'NOXH_ADMIN_PASSWORD'
];
for (const name of requiredEnvironment) assert.ok(process.env[name], `Missing ${name}.`);

const request = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
};
const readBody = async response => {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return text; }
};
const signIn = async (label, email, password) => {
  const response = await request(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const body = await readBody(response);
  assert.equal(response.status, 200, `${label} login failed (${response.status}).`);
  assert.ok(body?.access_token && body?.user?.id, `${label} login returned no session.`);
  return body;
};
const headersFor = (session, extra = {}) => ({
  apikey: publishableKey,
  Authorization: `Bearer ${session.access_token}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
  ...extra
});
const rest = async (session, table, query = '', options = {}) => {
  const response = await request(`${supabaseUrl}/rest/v1/${table}${query ? `?${query}` : ''}`, {
    ...options,
    headers: headersFor(session, options.headers)
  });
  return { response, body: await readBody(response) };
};
const expectBlockedOrEmpty = ({ response, body }, label) => {
  if (response.ok) assert.deepEqual(body, [], `${label} unexpectedly affected or returned a protected row.`);
  else assert.ok([400, 401, 403].includes(response.status), `${label} returned unexpected status ${response.status}.`);
};
const logPass = label => console.log(`PASS: ${label}`);

const userA = await signIn('User A', process.env.NOXH_USER_A_EMAIL, process.env.NOXH_USER_A_PASSWORD);
const userB = await signIn('User B', process.env.NOXH_USER_B_EMAIL, process.env.NOXH_USER_B_PASSWORD);
const admin = await signIn('Admin', process.env.NOXH_ADMIN_EMAIL, process.env.NOXH_ADMIN_PASSWORD);
assert.notEqual(userA.user.id, userB.user.id, 'User A and User B must be different Auth accounts.');
logPass('three distinct sessions authenticated');

const ownProfile = async session => {
  const result = await rest(session, 'users', `auth_user_id=eq.${encodeURIComponent(session.user.id)}&select=*`);
  assert.equal(result.response.status, 200, 'Profile lookup failed.');
  assert.equal(result.body.length, 1, 'Authenticated account must have exactly one linked profile.');
  return result.body[0];
};
const profileA = await ownProfile(userA);
const profileB = await ownProfile(userB);
const profileAdmin = await ownProfile(admin);
assert.equal(profileA.role, 'user', 'User A must have role=user before testing.');
assert.equal(profileB.role, 'user', 'User B must have role=user before testing.');
assert.equal(profileAdmin.role, 'admin', 'Admin account must have role=admin.');
logPass('profile/Auth links and expected roles');

const crossProfileRead = await rest(userA, 'users', `id=eq.${profileB.id}&select=*`);
assert.equal(crossProfileRead.response.status, 200);
assert.deepEqual(crossProfileRead.body, [], 'User A can read User B profile.');
expectBlockedOrEmpty(await rest(userA, 'users', `id=eq.${profileB.id}`, {
  method: 'PATCH', body: JSON.stringify({ full_name: profileB.full_name })
}), 'User A cross-profile update');
logPass('User A cannot read or update User B profile');

const escalation = await rest(userA, 'users', `id=eq.${profileA.id}`, {
  method: 'PATCH', body: JSON.stringify({ role: 'admin' })
});
assert.ok(!escalation.response.ok, 'User A was allowed to submit a role update.');
assert.ok([400, 401, 403].includes(escalation.response.status), `Role update returned unexpected status ${escalation.response.status}.`);
assert.equal((await ownProfile(userA)).role, 'user', 'User A role changed after the blocked escalation attempt.');

const blockedOwnName = await rest(userA, 'users', `id=eq.${profileA.id}`, {
  method: 'PATCH', body: JSON.stringify({ full_name: `Blocked authz edit ${Date.now()}` })
});
assert.ok(!blockedOwnName.response.ok, 'User A can directly edit their own name.');
assert.ok([400, 401, 403].includes(blockedOwnName.response.status), `Own-name update returned unexpected status ${blockedOwnName.response.status}.`);
assert.equal((await ownProfile(userA)).full_name, profileA.full_name, 'User A name changed after the blocked update attempt.');

const heartbeat = await rest(userA, 'users', `id=eq.${profileA.id}`, {
  method: 'PATCH', body: JSON.stringify({ last_active_at: new Date().toISOString() })
});
assert.ok([200, 204].includes(heartbeat.response.status), `User A activity heartbeat failed (${heartbeat.response.status}).`);
logPass('User A cannot self-promote or edit profile identity; activity heartbeat remains allowed');

const adminUsers = await rest(admin, 'users', 'auth_user_id=not.is.null&select=id,role,auth_user_id');
assert.equal(adminUsers.response.status, 200, 'Admin cannot list linked profiles.');
assert.ok(adminUsers.body.some(row => row.id === profileA.id) && adminUsers.body.some(row => row.id === profileB.id), 'Admin cannot see both normal-user profiles.');
let restoreProfileBName = false;
try {
  const auditName = `Authorization test ${Date.now()}`;
  const adminEdit = await rest(admin, 'users', `id=eq.${profileB.id}`, {
    method: 'PATCH', body: JSON.stringify({ full_name: auditName })
  });
  assert.ok([200, 204].includes(adminEdit.response.status), `Admin cannot edit a user profile (${adminEdit.response.status}).`);
  restoreProfileBName = true;
  assert.equal((await ownProfile(userB)).full_name, auditName, 'Admin profile edit was not visible to User B.');
  logPass('admin can read users and edit a normal-user name');
} finally {
  if (restoreProfileBName) {
    const restored = await rest(admin, 'users', `id=eq.${profileB.id}`, {
      method: 'PATCH', body: JSON.stringify({ full_name: profileB.full_name })
    });
    assert.ok([200, 204].includes(restored.response.status), 'Could not restore User B name after the test.');
  }
}

const publishedProjects = await rest(userA, 'projects', 'is_draft=eq.false&select=id&limit=100');
assert.equal(publishedProjects.response.status, 200);
assert.ok(publishedProjects.body.length, 'No published project is available for relation tests.');

const relationCleanup = [];
try {
  for (const table of ['user_saved_projects', 'user_followed_projects']) {
    const existing = await rest(userA, table, `user_id=eq.${profileA.id}&select=project_id`);
    assert.equal(existing.response.status, 200);
    const existingIds = new Set(existing.body.map(row => row.project_id));
    const project = publishedProjects.body.find(row => !existingIds.has(row.id));
    assert.ok(project, `User A already has every sampled project in ${table}; cannot create an isolated test row.`);

    const inserted = await rest(userA, table, '', {
      method: 'POST', body: JSON.stringify({ user_id: profileA.id, project_id: project.id })
    });
    assert.ok([200, 201].includes(inserted.response.status), `User A cannot insert its own ${table} row.`);
    relationCleanup.push({ table, projectId: project.id });

    const crossRead = await rest(userB, table, `user_id=eq.${profileA.id}&project_id=eq.${project.id}&select=*`);
    assert.equal(crossRead.response.status, 200);
    assert.deepEqual(crossRead.body, [], `User B can read User A row in ${table}.`);
    expectBlockedOrEmpty(await rest(userB, table, `user_id=eq.${profileA.id}&project_id=eq.${project.id}`, { method: 'DELETE' }), `User B delete in ${table}`);
    const stillPresent = await rest(userA, table, `user_id=eq.${profileA.id}&project_id=eq.${project.id}&select=*`);
    assert.equal(stillPresent.body.length, 1, `User B affected User A row in ${table}.`);
    logPass(`${table}: own write works and cross-user access is blocked`);
  }
} finally {
  for (const item of relationCleanup) {
    await rest(userA, item.table, `user_id=eq.${profileA.id}&project_id=eq.${item.projectId}`, { method: 'DELETE' });
  }
}

const auditId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const draftSlug = `security-audit-${auditId}`;
let draftProjectId = '';
try {
  const normalInsert = await rest(userA, 'projects', '', {
    method: 'POST',
    body: JSON.stringify({ title: 'Security audit', location: 'QA', status: 'Đang cập nhật', is_draft: true, slug: draftSlug, details_json: {} })
  });
  assert.ok(!normalInsert.response.ok, 'User A can create projects.');

  const adminInsert = await rest(admin, 'projects', '', {
    method: 'POST',
    body: JSON.stringify({ title: 'Security audit', location: 'QA', status: 'Đang cập nhật', is_draft: true, slug: draftSlug, details_json: {} })
  });
  assert.ok([200, 201].includes(adminInsert.response.status), `Admin draft insert failed (${adminInsert.response.status}).`);
  draftProjectId = adminInsert.body?.[0]?.id;
  assert.ok(draftProjectId, 'Admin draft insert returned no row id.');
  const hiddenDraft = await rest(userA, 'projects', `id=eq.${draftProjectId}&select=id`);
  assert.deepEqual(hiddenDraft.body, [], 'Normal user can read an admin draft project.');
  logPass('normal user cannot manage projects; admin can create a private draft');
} finally {
  if (draftProjectId) await rest(admin, 'projects', `id=eq.${draftProjectId}`, { method: 'DELETE' });
}

const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const storagePath = `security-audit/${auditId}.png`;
const upload = async (session, bucket, objectPath) => {
  const response = await request(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: 'POST',
    headers: headersFor(session, { 'Content-Type': 'image/png', 'x-upsert': 'false' }),
    body: pixel
  });
  return { response, body: await readBody(response) };
};
const deleteObject = async (session, bucket, objectPath) => {
  const response = await request(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: 'DELETE', headers: headersFor(session)
  });
  return { response, body: await readBody(response) };
};

let publicUploaded = false;
let privateUploaded = false;
try {
  assert.ok(!(await upload(userA, 'project-images', storagePath)).response.ok, 'User A can upload public project images.');
  const adminPublicUpload = await upload(admin, 'project-images', storagePath);
  assert.ok(adminPublicUpload.response.ok, `Admin project-image upload failed (${adminPublicUpload.response.status}).`);
  publicUploaded = true;
  assert.ok(!(await deleteObject(userB, 'project-images', storagePath)).response.ok, 'User B can delete project images.');
  const publicRead = await request(`${supabaseUrl}/storage/v1/object/public/project-images/${storagePath}`);
  assert.equal(publicRead.status, 200, 'Uploaded public image cannot be read.');
  logPass('project image upload/delete is admin-only and public read works');

  const privatePath = `documents/guides/${storagePath}`;
  assert.ok(!(await upload(userA, 'private-documents', privatePath)).response.ok, 'User A can upload private documents.');
  const adminPrivateUpload = await upload(admin, 'private-documents', privatePath);
  assert.ok(adminPrivateUpload.response.ok, `Admin private-document upload failed (${adminPrivateUpload.response.status}).`);
  privateUploaded = privatePath;
  const signResponse = await request(`${supabaseUrl}/storage/v1/object/sign/private-documents/${privatePath}`, {
    method: 'POST', headers: headersFor(userA), body: JSON.stringify({ expiresIn: 60 })
  });
  assert.equal(signResponse.status, 200, 'Authenticated user cannot sign a private document URL.');
  const signed = await readBody(signResponse);
  assert.ok(signed?.signedURL || signed?.signedUrl, 'Private document signing returned no URL.');
  assert.ok(!(await deleteObject(userB, 'private-documents', privatePath)).response.ok, 'User B can delete private documents.');
  logPass('private-document upload/delete is admin-only and signed read works for authenticated users');
} finally {
  if (publicUploaded) await deleteObject(admin, 'project-images', storagePath);
  if (privateUploaded) await deleteObject(admin, 'private-documents', privateUploaded);
}

console.log('Production authenticated authorization matrix passed; temporary rows and objects were cleaned up.');
