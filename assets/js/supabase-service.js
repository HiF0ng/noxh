// Supabase Service Layer
// Handles all CRUD operations using Supabase REST API

(function() {
    const config = window.SUPABASE_CONFIG;
    if (!config || !config.url || !config.anonKey) {
        console.error('Supabase config is missing. Please ensure supabase-config.js is loaded first.');
        return;
    }

    const BASE_URL = `${config.url}/rest/v1`;

    const AUTH_SESSION_KEY = 'noxh_auth_session';
    const ADMIN_AUTH_SESSION_KEY = 'noxh_admin_auth_session';
    let authContext = 'user';
    let refreshInFlight = null;
    const isAdminContext = () => authContext === 'admin';
    const getSessionKey = () => isAdminContext() ? ADMIN_AUTH_SESSION_KEY : AUTH_SESSION_KEY;
    const getAuthSession = () => {
        try { const key = getSessionKey(); return JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || 'null'); }
        catch (_) { return null; }
    };
    const getAccessToken = () => getAuthSession()?.access_token || config.anonKey;
    const getHeaders = () => ({
        'apikey': config.anonKey,
        'Authorization': `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    });
    const clearInvalidUserSession = () => {
        if (isAdminContext()) return;
        [localStorage, sessionStorage].forEach(store => {
            store.removeItem(AUTH_SESSION_KEY);
            store.removeItem('isLoggedIn');
            store.removeItem('currentUser');
        });
    };
    const refreshStoredSession = async () => {
        const session = getAuthSession();
        if (!session?.refresh_token) return null;
        if (refreshInFlight) return refreshInFlight;
        refreshInFlight = (async () => {
            try {
                const res = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
                    method: 'POST',
                    headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: session.refresh_token })
                });
                if (!res.ok) return null;
                const refreshed = await res.json();
                localStorage.setItem(getSessionKey(), JSON.stringify(refreshed));
                return refreshed;
            } catch (_) { return null; }
            finally { refreshInFlight = null; }
        })();
        return refreshInFlight;
    };
    const fetchReadWithRetry = async (url, options = {}) => {
        let lastError;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                const headers = { ...(options.headers || {}), ...getHeaders() };
                const response = await fetch(url, { ...options, headers, cache: 'no-store' });
                if (response.ok || attempt === 2) return response;
                if ((response.status === 401 || response.status === 403) && getAuthSession()) {
                    const refreshed = await refreshStoredSession();
                    if (!refreshed) clearInvalidUserSession();
                    continue;
                }
                lastError = new Error(`Request failed with status ${response.status}`);
            } catch (error) {
                lastError = error;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        throw lastError || new Error('Không thể kết nối máy chủ dữ liệu.');
    };
    const translateAuthError = message => {
        const text = String(message || '');
        const rateLimit = text.match(/For security purposes, you can only request this after\s+(\d+)\s+seconds/i);
        if (rateLimit) return `Vì lý do bảo mật, bạn chỉ có thể gửi lại yêu cầu sau ${rateLimit[1]} giây.`;
        if (/User already registered/i.test(text)) return 'Email này đã được đăng ký.';
        if (/Invalid login credentials/i.test(text)) return 'Email hoặc mật khẩu không chính xác.';
        if (/Email not confirmed/i.test(text)) return 'Email chưa được xác thực.';
        return text;
    };

    const FORM_CATEGORIES = ['Đơn mua', 'Đơn thuê'];
    const DOCUMENT_META_VERSION = 2;
    const readDocumentContent = value => {
        const fallback = { description: String(value || ''), attachments: {}, guide: null };
        if (!value || typeof value !== 'string' || value.trim().charAt(0) !== '{') return fallback;
        try {
            const parsed = JSON.parse(value);
            if (!parsed || parsed._noxhDocument !== DOCUMENT_META_VERSION) return fallback;
            return {
                description: String(parsed.description || ''),
                attachments: parsed.attachments && typeof parsed.attachments === 'object' ? parsed.attachments : {},
                guide: parsed.guide && typeof parsed.guide === 'object' ? parsed.guide : null
            };
        } catch (_) {
            return fallback;
        }
    };
    const writeDocumentContent = docData => JSON.stringify({
        _noxhDocument: DOCUMENT_META_VERSION,
        description: docData.desc || '',
        attachments: {
            pdf: docData.pdfUrl || '',
            docx: docData.docxUrl || ''
        },
        guide: docData.guide || null
    });
    const cleanDocumentTitle = title => String(title || '')
        .replace(/\s*\((?:PDF|DOCX)\)\s*$/i, '')
        .replace(/\.(?:pdf|docx?)$/i, '')
        .trim();
    const mapDocumentRecord = db => {
        const meta = readDocumentContent(db.content);
        const legacyType = String(db.doc_type || 'PDF').toUpperCase();
        const pdfUrl = meta.attachments.pdf || (legacyType === 'PDF' ? db.file_url : '');
        const docxUrl = meta.attachments.docx || (legacyType === 'DOCX' ? db.file_url : '');
        const availableTypes = [pdfUrl && 'PDF', docxUrl && 'DOCX'].filter(Boolean);
        return {
            id: db.id,
            sourceIds: [db.id],
            name: db.title,
            type: db.category,
            file: db.file_url,
            fileUrl: db.file_url,
            pdfUrl,
            docxUrl,
            docType: availableTypes.join(', ') || legacyType,
            desc: meta.description,
            guide: meta.guide,
            guideStatus: meta.guide && meta.guide.status || '',
            isDraft: !!db.is_draft,
            draftKey: db.draft_key || '',
            createdAt: db.created_at,
            date: new Date(db.created_at).toLocaleDateString('vi-VN'),
            notes: meta.guide && Array.isArray(meta.guide.notes) ? meta.guide.notes : []
        };
    };
    const mergeFormDocuments = records => {
        const output = [];
        const grouped = new Map();
        records.forEach(record => {
            if (!FORM_CATEGORIES.includes(record.type)) {
                output.push(record);
                return;
            }
            const groupKey = record.isDraft && record.draftKey
                ? `draft:${record.draftKey}`
                : `${record.type}:${cleanDocumentTitle(record.name).toLocaleLowerCase('vi')}`;
            const existing = grouped.get(groupKey);
            if (!existing) {
                record.name = cleanDocumentTitle(record.name);
                grouped.set(groupKey, record);
                output.push(record);
                return;
            }
            existing.sourceIds = [...new Set(existing.sourceIds.concat(record.sourceIds))];
            existing.pdfUrl = existing.pdfUrl || record.pdfUrl;
            existing.docxUrl = existing.docxUrl || record.docxUrl;
            existing.file = existing.pdfUrl || existing.docxUrl || existing.file;
            existing.fileUrl = existing.file;
            existing.docType = [existing.pdfUrl && 'PDF', existing.docxUrl && 'DOCX'].filter(Boolean).join(', ') || existing.docType;
            if (!existing.desc && record.desc) existing.desc = record.desc;
            if (!existing.guide && record.guide) {
                existing.guide = record.guide;
                existing.guideStatus = record.guideStatus;
            }
        });
        return output;
    };

    const SupabaseService = {
        // --- Supabase Auth ---
        getAuthSession,
        setAuthContext(context) { authContext = context === 'admin' ? 'admin' : 'user'; },
        migrateLegacyAdminSession() {
            if (!isAdminContext() || getAuthSession() || !localStorage.getItem('adminUser')) return;
            try {
                const legacySession = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY) || 'null');
                if (legacySession?.access_token) localStorage.setItem(ADMIN_AUTH_SESSION_KEY, JSON.stringify(legacySession));
            } catch (_) {}
        },
        async signInWithPassword(email, password) {
            try {
                const res = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
                    method: 'POST',
                    headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (!res.ok) return { success: false, error: translateAuthError(data?.error_description || data?.msg || 'Đăng nhập không thành công.') };
                localStorage.setItem(getSessionKey(), JSON.stringify(data));
                if (!isAdminContext()) localStorage.setItem('isLoggedIn', 'true');
                const profile = await this.getCurrentProfile();
                const user = profile || { id: data.user.id, email: data.user.email, full_name: data.user.user_metadata?.full_name || '' };
                if (isAdminContext()) {
                    // Remove only a legacy public session for this same admin account.
                    // A separate website user's session is left untouched.
                    const publicSession = (() => {
                        try { return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY) || 'null'); }
                        catch (_) { return null; }
                    })();
                    if (publicSession?.user?.id === data.user.id) {
                        [localStorage, sessionStorage].forEach(store => {
                            store.removeItem(AUTH_SESSION_KEY);
                            store.removeItem('isLoggedIn');
                            store.removeItem('currentUser');
                        });
                    }
                } else {
                    localStorage.setItem('currentUser', JSON.stringify(user));
                }
                return { success: true, user, session: data };
            } catch (err) {
                console.error('Supabase Auth login error:', err);
                return { success: false, error: 'Không thể kết nối dịch vụ đăng nhập.' };
            }
        },
        async signUpWithPassword({ email, password, fullName, phone }) {
            try {
                const res = await fetch(`${config.url}/auth/v1/signup`, {
                    method: 'POST',
                    headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, data: { full_name: fullName, phone: phone || '' } })
                });
                const data = await res.json();
                if (!res.ok) return { success: false, error: translateAuthError(data?.msg || data?.error_description || 'Không thể tạo tài khoản.') };
                if (data.access_token) {
                    localStorage.setItem(getSessionKey(), JSON.stringify(data));
                    localStorage.setItem('isLoggedIn', 'true');
                    const profile = await this.getCurrentProfile();
                    const user = profile || { id: data.user.id, email: data.user.email, full_name: data.user.user_metadata?.full_name || '' };
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    return { success: true, needsEmailConfirmation: false, user, session: data };
                }
                return { success: false, error: 'Hệ thống chưa thể đăng nhập ngay sau khi đăng ký. Vui lòng liên hệ hỗ trợ.' };
            } catch (err) {
                console.error('Supabase Auth signup error:', err);
                return { success: false, error: 'Không thể kết nối dịch vụ đăng ký.' };
            }
        },
        async signOut() {
            const session = getAuthSession();
            try {
                if (session?.access_token) await fetch(`${config.url}/auth/v1/logout`, { method: 'POST', headers: getHeaders() });
            } finally {
                [localStorage, sessionStorage].forEach(store => {
                    store.removeItem(getSessionKey());
                    if (!isAdminContext()) { store.removeItem('isLoggedIn'); store.removeItem('currentUser'); }
                });
            }
        },
        async refreshAuthSession() {
            return refreshStoredSession();
        },
        async requestPasswordReset(email) {
            try {
                const res = await fetch(`${config.url}/auth/v1/recover`, {
                    method: 'POST',
                    headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json().catch(() => ({}));
                return {
                    success: res.ok,
                    error: translateAuthError(data?.error_description || data?.msg || 'Không thể gửi email khôi phục. Vui lòng thử lại sau.')
                };
            } catch (_) {
                return { success: false, error: 'Không thể kết nối dịch vụ gửi email. Vui lòng thử lại.' };
            }
        },
        async verifyRecoveryOtp(email, token) {
            try {
                const res = await fetch(`${config.url}/auth/v1/verify`, {
                    method: 'POST',
                    headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, token, type: 'recovery' })
                });
                const data = await res.json();
                if (!res.ok || !data?.access_token) {
                    return { success: false, error: translateAuthError(data?.error_description || data?.msg || 'Mã xác thực không hợp lệ hoặc đã hết hạn.') };
                }
                localStorage.setItem(getSessionKey(), JSON.stringify(data));
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('currentUser', JSON.stringify(data.user || { id: '', email }));
                return { success: true, user: data.user || { email } };
            } catch (_) {
                return { success: false, error: 'Không thể xác thực mã. Vui lòng thử lại.' };
            }
        },
        async updateAuthPassword(password) {
            try {
                const res = await fetch(`${config.url}/auth/v1/user`, {
                    method: 'PUT', headers: getHeaders(), body: JSON.stringify({ password })
                });
                const data = await res.json().catch(() => ({}));
                return { success: res.ok, error: translateAuthError(data?.error_description || data?.msg || 'Không thể đổi mật khẩu. Vui lòng thử lại.') };
            } catch (_) { return { success: false, error: 'Không thể kết nối dịch vụ đổi mật khẩu. Vui lòng thử lại.' }; }
        },
        async getCurrentProfile() {
            const authId = getAuthSession()?.user?.id;
            if (!authId) return null;
            try {
                const res = await fetch(`${BASE_URL}/users?auth_user_id=eq.${encodeURIComponent(authId)}&select=*`, { headers: getHeaders() });
                if (!res.ok) return null;
                return (await res.json())[0] || null;
            } catch (_) { return null; }
        },
        // --- Projects ---
        async getProject(id) {
            try {
                const res = await fetchReadWithRetry(`${BASE_URL}/projects?id=eq.${id}&select=*`, { headers: getHeaders() });
                if (!res.ok) throw new Error('Failed to fetch project');
                const data = await res.json();
                if (data && data.length > 0) {
                    const db = data[0];
                    return {
                        id: db.id,
                        name: db.title,
                        location: db.location,
                        owner: db.investor,
                        status: db.status,
                        progress: db.progress,
                        desc: db.details_json?.desc || '',
                        imageUrl: db.details_json?.mainImageUrl || db.details_json?.imageUrl || db.details_json?.image_url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80',
                        price: db.details_json?.price || 'Từ 15tr/m²',
                        investor: db.investor,
                        scale: db.details_json?.scale || 'Đang cập nhật',
                        area: db.details_json?.area || 'Đang cập nhật',
                        handover: db.details_json?.handover || 'Đang cập nhật',
                        details: db.details_json || {}
                    };
                }
                return null;
            } catch (err) {
                console.error(err);
                return null;
            }
        },

        async getProjects() {
            try {
                const res = await fetchReadWithRetry(`${BASE_URL}/projects?select=*`, { headers: getHeaders() });
                if (!res.ok) throw new Error('Failed to fetch projects');
                const data = await res.json();
                return data.map(db => ({
                    id: db.id, // Supabase UUID
                    name: db.title,
                    location: db.location,
                    owner: db.investor,
                    status: db.status,
                    progress: db.progress,
                    desc: db.details_json?.desc || '',
                    imageUrl: db.details_json?.mainImageUrl || '',
                    details: db.details_json || {},
                    created_at: db.created_at
                }));
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        async getProjectCount() {
            try {
                const res = await fetch(`${BASE_URL}/projects?select=id`, { 
                    headers: { ...getHeaders(), 'Prefer': 'count=exact' },
                    method: 'HEAD'
                });
                return parseInt(res.headers.get('content-range')?.split('/')[1] || '0', 10);
            } catch (err) {
                console.error(err);
                return 0;
            }
        },

        async addProject(projectData) {
            try {
                const payload = {
                    title: projectData.name,
                    location: projectData.location || 'Hà Nội',
                    investor: projectData.owner || '',
                    status: projectData.status || 'Chờ xây dựng',
                    details_json: projectData.details || { desc: projectData.desc || '' }
                };
                const res = await fetch(`${BASE_URL}/projects`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to add project');
                const data = await res.json();
                return data[0] || data;
            } catch (err) {
                console.error(err);
                return null;
            }
        },

        async updateProject(id, projectData) {
            try {
                const payload = {
                    title: projectData.name,
                    location: projectData.location || 'Hà Nội',
                    investor: projectData.owner || '',
                    status: projectData.status || 'Chờ xây dựng',
                    details_json: projectData.details || { desc: projectData.desc || '' }
                };
                const res = await fetch(`${BASE_URL}/projects?id=eq.${id}`, {
                    method: 'PATCH',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to update project');
                const data = await res.json();
                return data[0] || data;
            } catch (err) {
                console.error(err);
                return null;
            }
        },

        async deleteProject(id) {
            try {
                const res = await fetch(`${BASE_URL}/projects?id=eq.${id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                if (!res.ok) throw new Error('Failed to delete project');
                return true;
            } catch (err) {
                console.error(err);
                return false;
            }
        },

        async isProjectSaved(userId, projectId) {
            try {
                const res = await fetch(`${BASE_URL}/user_saved_projects?user_id=eq.${encodeURIComponent(userId)}&project_id=eq.${encodeURIComponent(projectId)}&select=project_id`, { headers: getHeaders() });
                if (!res.ok) throw new Error('Failed to check saved project');
                return (await res.json()).length > 0;
            } catch (err) {
                console.error('Check saved project error:', err);
                return false;
            }
        },

        async setProjectSaved(userId, projectId, saved) {
            try {
                const url = `${BASE_URL}/user_saved_projects?user_id=eq.${encodeURIComponent(userId)}&project_id=eq.${encodeURIComponent(projectId)}`;
                const res = saved
                    ? await fetch(`${BASE_URL}/user_saved_projects`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ user_id: userId, project_id: projectId }) })
                    : await fetch(url, { method: 'DELETE', headers: getHeaders() });
                if (!res.ok) throw new Error('Failed to update saved project');
                return true;
            } catch (err) {
                console.error('Update saved project error:', err);
                return false;
            }
        },

        async getSavedProjects(userId) {
            try {
                const res = await fetch(`${BASE_URL}/user_saved_projects?user_id=eq.${encodeURIComponent(userId)}&select=projects(*)&order=created_at.desc`, { headers: getHeaders() });
                if (!res.ok) throw new Error('Failed to fetch saved projects');
                return (await res.json()).map(row => {
                    const db = row.projects;
                    if (!db) return null;
                    return { id: db.id, name: db.title, location: db.location, owner: db.investor, status: db.status, progress: db.progress, desc: db.details_json?.desc || '', imageUrl: db.details_json?.mainImageUrl || '', details: db.details_json || {}, created_at: db.created_at };
                }).filter(Boolean);
            } catch (err) {
                console.error('Fetch saved projects error:', err);
                return null;
            }
        },

        async isProjectFollowed(userId, projectId) {
            try {
                const res = await fetch(`${BASE_URL}/user_followed_projects?user_id=eq.${encodeURIComponent(userId)}&project_id=eq.${encodeURIComponent(projectId)}&select=project_id`, { headers: getHeaders() });
                if (!res.ok) throw new Error('Failed to check followed project');
                return (await res.json()).length > 0;
            } catch (err) {
                console.error('Check followed project error:', err);
                return false;
            }
        },

        async setProjectFollowed(userId, projectId, followed) {
            try {
                const url = `${BASE_URL}/user_followed_projects?user_id=eq.${encodeURIComponent(userId)}&project_id=eq.${encodeURIComponent(projectId)}`;
                const res = followed
                    ? await fetch(`${BASE_URL}/user_followed_projects`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ user_id: userId, project_id: projectId }) })
                    : await fetch(url, { method: 'DELETE', headers: getHeaders() });
                if (!res.ok) throw new Error('Failed to update followed project');
                return true;
            } catch (err) {
                console.error('Update followed project error:', err);
                return false;
            }
        },

        async getFollowedProjects(userId) {
            try {
                const res = await fetch(`${BASE_URL}/user_followed_projects?user_id=eq.${encodeURIComponent(userId)}&select=projects(*)&order=created_at.desc`, { headers: getHeaders() });
                if (!res.ok) throw new Error('Failed to fetch followed projects');
                return (await res.json()).map(row => {
                    const db = row.projects;
                    if (!db) return null;
                    return { id: db.id, name: db.title, location: db.location, owner: db.investor, status: db.status, progress: db.progress, desc: db.details_json?.desc || '', imageUrl: db.details_json?.mainImageUrl || '', details: db.details_json || {}, created_at: db.created_at };
                }).filter(Boolean);
            } catch (err) {
                console.error('Fetch followed projects error:', err);
                return null;
            }
        },

        // --- Users ---
        async getUsers() {
            try {
                const res = await fetch(`${BASE_URL}/users?auth_user_id=not.is.null&select=*`, { headers: getHeaders() });
                if (!res.ok) throw new Error('Failed to fetch users');
                const data = await res.json();
                
                const bgColors = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700'];
                
                return data.map((db, index) => {
                    const name = db.full_name || 'User';
                    const words = name.split(' ');
                    let initials = '';
                    if (words.length >= 2) {
                        initials = words[0].charAt(0) + words[words.length - 1].charAt(0);
                    } else {
                        initials = name.substring(0, 2);
                    }
                    initials = initials.toUpperCase();
                    
                    return {
                        id: db.id,
                        name: name,
                        email: db.email,
                        phone: db.phone || '',
                        date: new Date(db.created_at).toLocaleDateString('vi-VN'),
                        role: db.role || 'user',
                        avatarText: initials,
                        avatarBg: bgColors[index % bgColors.length],
                        last_active_at: db.last_active_at
                    };
                });
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        async getUser(emailOrId) {
            try {
                const isId = /^[0-9a-fA-F-]+$/.test(emailOrId) || !isNaN(emailOrId);
                const queryParam = isId ? `id=eq.${emailOrId}` : `email=eq.${encodeURIComponent(emailOrId)}`;
                const res = await fetch(`${BASE_URL}/users?${queryParam}&select=*`, { headers: getHeaders() });
                if (!res.ok) throw new Error('Failed to fetch user');
                const data = await res.json();
                return data[0] || null;
            } catch (err) {
                console.error(err);
                return null;
            }
        },

        async uploadProjectImage(projectId, file, group = 'images') {
            try {
                let safeName = file.name || 'image';
                safeName = safeName.replace(/[#?%\\/]/g, '_');
                const path = `${projectId}/${group}/${Date.now()}-${safeName}`;
                const res = await fetch(`${config.url}/storage/v1/object/project-images/${path}`, {
                    method: 'POST',
                    headers: { ...getHeaders(), 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' },
                    body: file
                });
                if (!res.ok) throw new Error(await res.text());
                return `${config.url}/storage/v1/object/public/project-images/${path}`;
            } catch (err) {
                console.error('Project image upload error:', err);
                return null;
            }
        },

        async resetPasswordByEmail(email, newPassword) {
            try {
                const res = await fetch(`${BASE_URL}/users?email=eq.${encodeURIComponent(email)}`, {
                    method: 'PATCH',
                    headers: getHeaders(),
                    body: JSON.stringify({ password_hash: newPassword })
                });
                if (!res.ok) throw new Error('Failed to reset password');
                const data = await res.json();
                return Array.isArray(data) ? data[0] || null : data;
            } catch (err) {
                console.error('Reset password error:', err);
                return null;
            }
        },

        async updateUserActivity(id) {
            try {
                const res = await fetch(`${BASE_URL}/users?id=eq.${id}`, {
                    method: 'PATCH',
                    headers: getHeaders(),
                    body: JSON.stringify({ last_active_at: new Date().toISOString() })
                });
                return res.ok;
            } catch (err) {
                console.error('Update user activity error:', err);
                return false;
            }
        },

        async getUserCount() {
            try {
                const res = await fetch(`${BASE_URL}/users?select=id`, { 
                    headers: { ...getHeaders(), 'Prefer': 'count=exact' },
                    method: 'HEAD'
                });
                return parseInt(res.headers.get('content-range')?.split('/')[1] || '0', 10);
            } catch (err) {
                console.error(err);
                return 0;
            }
        },

        async addUser(userData) {
            try {
                const payload = {
                    full_name: userData.name,
                    email: userData.email,
                    password_hash: 'default_hash', // Since it's admin adding
                    role: 'user'
                };
                const res = await fetch(`${BASE_URL}/users`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to add user');
                const data = await res.json();
                return data[0] || data;
            } catch (err) {
                console.error(err);
                return null;
            }
        },

        async updateUser(id, userData) {
            try {
                const payload = {
                    full_name: userData.name
                };
                if (userData.phone !== undefined) {
                    payload.phone = userData.phone;
                }

                const res = await fetch(`${BASE_URL}/users?id=eq.${id}`, {
                    method: 'PATCH',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error('Failed to update user');

                const data = await res.json();
                return data[0] || data;
            } catch (err) {
                console.error(err);
                return null;
            }
        },

        async deleteUser(id) {
            try {
                const res = await fetch(`${BASE_URL}/users?id=eq.${id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                if (!res.ok) throw new Error('Failed to delete user');
                return true;
            } catch (err) {
                console.error(err);
                return false;
            }
        },

        // --- News ---
        async getNews() {
            try {
                const res = await fetch(`${BASE_URL}/news?select=*`, { headers: getHeaders() });
                if (!res.ok) throw new Error('Failed to fetch news');
                const data = await res.json();
                return data.map(db => ({
                    id: db.id,
                    title: db.title,
                    category: 'Tin tức', // Not in schema
                    status: db.status === 'published' ? 'Đã xuất bản' : 'Bản nháp',
                    date: new Date(db.created_at).toLocaleDateString('vi-VN'),
                    views: 0,
                    summary: db.summary,
                    content: db.content,
                    image: db.image_url
                }));
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        async addNews(newsData) {
            try {
                const payload = {
                    title: newsData.title,
                    summary: newsData.summary || '',
                    content: newsData.content || '',
                    status: newsData.status === 'Đã xuất bản' ? 'published' : 'draft',
                    image_url: newsData.image || ''
                };
                const res = await fetch(`${BASE_URL}/news`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to add news');
                const data = await res.json();
                return data[0] || data;
            } catch (err) {
                console.error(err);
                return null;
            }
        },

        async updateNews(id, newsData) {
            try {
                const payload = {
                    title: newsData.title,
                    summary: newsData.summary || '',
                    content: newsData.content || '',
                    status: newsData.status === 'Đã xuất bản' ? 'published' : 'draft',
                    image_url: newsData.image || ''
                };
                const res = await fetch(`${BASE_URL}/news?id=eq.${id}`, {
                    method: 'PATCH',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to update news');
                const data = await res.json();
                return data[0] || data;
            } catch (err) {
                console.error(err);
                return null;
            }
        },

        async deleteNews(id) {
            try {
                const res = await fetch(`${BASE_URL}/news?id=eq.${id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                if (!res.ok) throw new Error('Failed to delete news');
                return true;
            } catch (err) {
                console.error(err);
                return false;
            }
        },

        // --- Documents ---
        async getDocuments() {
            try {
                const res = await fetchReadWithRetry(`${BASE_URL}/documents?select=*`, { headers: getHeaders() });
                if (!res.ok) throw new Error('Failed to fetch documents');
                const data = await res.json();
                return mergeFormDocuments(data.map(mapDocumentRecord));
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        async addDocument(docData) {
            try {
                const usesCombinedPayload = FORM_CATEGORIES.includes(docData.type) || docData.guide || docData.pdfUrl || docData.docxUrl;
                const fileUrl = docData.pdfUrl || docData.docxUrl || docData.file || '';
                const combinedType = [docData.pdfUrl && 'PDF', docData.docxUrl && 'DOCX'].filter(Boolean).join(', ');
                const payload = {
                    title: docData.name,
                    category: docData.type,
                    doc_type: combinedType || docData.docType || (docData.isDraft ? 'DRAFT' : 'PDF'),
                    file_url: fileUrl,
                    content: usesCombinedPayload ? writeDocumentContent({ ...docData, pdfUrl: docData.pdfUrl || '', docxUrl: docData.docxUrl || '' }) : (docData.desc || ''),
                    is_draft: !!docData.isDraft,
                    draft_key: docData.draftKey || null
                };
                const res = await fetch(`${BASE_URL}/documents`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to add document');
                const data = await res.json();
                return data[0] || data;
            } catch (err) {
                console.error(err);
                return null;
            }
        },

        async updateOwnProfile(userData) {
            const profile = await this.getCurrentProfile();
            if (!profile) return null;
            try {
                const authPayload = { data: { full_name: userData.name, phone: userData.phone || '' } };
                if (userData.email && userData.email !== profile.email) authPayload.email = userData.email;
                const authRes = await fetch(`${config.url}/auth/v1/user`, {
                    method: 'PUT', headers: getHeaders(), body: JSON.stringify(authPayload)
                });
                if (!authRes.ok) throw new Error('Failed to update Supabase Auth user');
                const payload = { full_name: userData.name, phone: userData.phone || '' };
                const res = await fetch(`${BASE_URL}/users?id=eq.${profile.id}`, {
                    method: 'PATCH', headers: getHeaders(), body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to update profile');
                const updated = (await res.json())[0] || null;
                if (updated) localStorage.setItem('currentUser', JSON.stringify(updated));
                return updated;
            } catch (err) {
                console.error('Update own profile error:', err);
                return null;
            }
        },

        async uploadDocumentFile(file, group = 'documents') {
            try {
                // Supabase Storage object keys reject Vietnamese diacritics. Keep the
                // object key ASCII-only; the Vietnamese title remains in `documents`
                // and is used as the browser download filename.
                let safeName = (file.name || 'document.pdf')
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/đ/g, 'd')
                    .replace(/Đ/g, 'D')
                    .replace(/[^a-zA-Z0-9._-]+/g, '_')
                    .replace(/_+/g, '_');
                if (!safeName || safeName === '.') safeName = 'document.pdf';
                const path = `documents/${group}/${Date.now()}-${safeName}`;
                const res = await fetch(`${config.url}/storage/v1/object/project-images/${path}`, {
                    method: 'POST',
                    headers: { ...getHeaders(), 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' },
                    body: file
                });
                if (!res.ok) throw new Error(await res.text());
                return `${config.url}/storage/v1/object/public/project-images/${path}`;
            } catch (err) {
                console.error('Document upload error:', err);
                return null;
            }
        },

        async updateDocument(id, docData) {
            try {
                const usesCombinedPayload = FORM_CATEGORIES.includes(docData.type) || docData.guide || docData.pdfUrl || docData.docxUrl;
                const fileUrl = docData.pdfUrl || docData.docxUrl || docData.file || '';
                const combinedType = [docData.pdfUrl && 'PDF', docData.docxUrl && 'DOCX'].filter(Boolean).join(', ');
                const payload = {
                    title: docData.name,
                    category: docData.type,
                    doc_type: combinedType || docData.docType || (docData.isDraft ? 'DRAFT' : 'PDF'),
                    file_url: fileUrl,
                    content: usesCombinedPayload ? writeDocumentContent({ ...docData, pdfUrl: docData.pdfUrl || '', docxUrl: docData.docxUrl || '' }) : (docData.desc || ''),
                    is_draft: !!docData.isDraft,
                    draft_key: docData.draftKey || null
                };
                const res = await fetch(`${BASE_URL}/documents?id=eq.${id}`, {
                    method: 'PATCH',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to update document');
                const data = await res.json();
                return data[0] || data;
            } catch (err) {
                console.error(err);
                return null;
            }
        },

        async deleteDocument(id, options = {}) {
            try {
                const lookup = await fetch(`${BASE_URL}/documents?id=eq.${id}&select=file_url,content`, { headers: getHeaders() });
                if (!lookup.ok) throw new Error('Failed to read document before deletion');
                const records = await lookup.json();
                const record = records[0] || {};
                const meta = readDocumentContent(record.content);
                const guideImageUrls = meta.guide && Array.isArray(meta.guide.imageUrls) ? meta.guide.imageUrls : [];
                const fileUrls = [...new Set([record.file_url, meta.attachments.pdf, meta.attachments.docx, meta.guide && meta.guide.imageUrl, ...guideImageUrls].filter(Boolean))];
                if (fileUrls.length && !options.keepFile) {
                    const marker = '/storage/v1/object/public/project-images/';
                    for (const fileUrl of fileUrls) {
                        const pathIndex = fileUrl.indexOf(marker);
                        if (pathIndex !== -1) {
                            const path = fileUrl.slice(pathIndex + marker.length);
                            const storageRes = await fetch(`${config.url}/storage/v1/object/project-images/${path}`, {
                                method: 'DELETE', headers: getHeaders()
                            });
                            if (!storageRes.ok) throw new Error('Failed to delete document file from storage');
                        }
                    }
                }
                const res = await fetch(`${BASE_URL}/documents?id=eq.${id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                if (!res.ok) throw new Error('Failed to delete document');
                return true;
            } catch (err) {
                console.error(err);
                return false;
            }
        },

        // --- FAQs ---
        async getFaqs() {
            try {
                const res = await fetch(`${BASE_URL}/faqs?select=*&order=category.asc,sort_order.asc,created_at.asc`, { headers: getHeaders() });
                if (!res.ok) throw new Error('Failed to fetch faqs');
                const data = await res.json();
                return data.map(db => ({
                    id: db.id,
                    question: db.question,
                    answer: db.answer,
                    category: db.category
                }));
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        async addFaq(faqData) {
            try {
                const payload = {
                    question: faqData.question,
                    answer: faqData.answer,
                    category: faqData.category
                };
                const res = await fetch(`${BASE_URL}/faqs`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to add faq');
                const data = await res.json();
                return data[0] || data;
            } catch (err) {
                console.error(err);
                return null;
            }
        },

        async updateFaq(id, faqData) {
            try {
                const payload = {
                    question: faqData.question,
                    answer: faqData.answer,
                    category: faqData.category
                };
                const res = await fetch(`${BASE_URL}/faqs?id=eq.${id}`, {
                    method: 'PATCH',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to update faq');
                const data = await res.json();
                return data[0] || data;
            } catch (err) {
                console.error(err);
                return null;
            }
        },

        async deleteFaq(id) {
            try {
                const res = await fetch(`${BASE_URL}/faqs?id=eq.${id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                if (!res.ok) throw new Error('Failed to delete faq');
                return true;
            } catch (err) {
                console.error(err);
                return false;
            }
        },

        // --- Auth ---
        async loginUser(email, password) { return this.signInWithPassword(email, password); },

        async registerUser(newUser) {
            return this.signUpWithPassword({ email: newUser.email, password: newUser.password_hash, fullName: newUser.full_name, phone: newUser.phone });
        }
    };

    window.SupabaseService = SupabaseService;
})();
