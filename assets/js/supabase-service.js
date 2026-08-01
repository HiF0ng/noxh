// Supabase Service Layer
// Handles all CRUD operations using Supabase REST API

(function() {
    const config = window.SUPABASE_CONFIG;
    if (!config || !config.url || !config.anonKey) {
        console.error('Supabase config is missing. Please ensure supabase-config.js is loaded first.');
        return;
    }

    const BASE_URL = `${config.url}/rest/v1`;

    const getHeaders = () => ({
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    });

    const SupabaseService = {
        // --- Projects ---
        async getProject(id) {
            try {
                const res = await fetch(`${BASE_URL}/projects?id=eq.${id}&select=*`, { headers: getHeaders() });
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
                const res = await fetch(`${BASE_URL}/projects?select=*`, { headers: getHeaders() });
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

        // --- Users ---
        async getUsers() {
            try {
                const res = await fetch(`${BASE_URL}/users?select=*`, { headers: getHeaders() });
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
                const safeName = (file.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
                const path = `${projectId}/${group}/${Date.now()}-${safeName}`;
                const res = await fetch(`${config.url}/storage/v1/object/project-images/${path}`, {
                    method: 'POST',
                    headers: { apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}`, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' },
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
                    full_name: userData.name,
                    email: userData.email
                };
                if (userData.phone !== undefined) {
                    payload.phone = userData.phone;
                }
                if (userData.password) {
                    payload.password_hash = userData.password;
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
                const res = await fetch(`${BASE_URL}/documents?select=*`, { headers: getHeaders() });
                if (!res.ok) throw new Error('Failed to fetch documents');
                const data = await res.json();
                return data.map(db => ({
                    id: db.id,
                    name: db.title,
                    type: db.category,
                    file: db.file_url,
                    desc: db.content,
                    date: new Date(db.created_at).toLocaleDateString('vi-VN'),
                    notes: [] // Notes not in schema natively, could use separate table or JSON
                }));
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        async addDocument(docData) {
            try {
                const payload = {
                    title: docData.name,
                    category: docData.type,
                    file_url: docData.file || '',
                    content: docData.desc || ''
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

        async updateDocument(id, docData) {
            try {
                const payload = {
                    title: docData.name,
                    category: docData.type,
                    file_url: docData.file || '',
                    content: docData.desc || ''
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

        async deleteDocument(id) {
            try {
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
        async loginUser(emailOrPhone, password) {
            try {
                // Try querying both email and phone first
                let res = await fetch(`${BASE_URL}/users?or=(email.eq.${encodeURIComponent(emailOrPhone)},phone.eq.${encodeURIComponent(emailOrPhone)})&select=*`, { headers: getHeaders() });
                
                // If it fails because of missing phone column, query by email only
                if (!res.ok) {
                    const errObj = await res.clone().json().catch(() => ({}));
                    if (errObj.code === 'PGRST204' || (errObj.message && errObj.message.includes('phone'))) {
                        res = await fetch(`${BASE_URL}/users?email=eq.${encodeURIComponent(emailOrPhone)}&select=*`, { headers: getHeaders() });
                    }
                }

                if (res && res.ok) {
                    const users = await res.json();
                    if (users && users.length > 0) {
                        const user = users[0];
                        if (user.password_hash === password) {
                            return { success: true, user: user };
                        } else {
                            return { success: false, error: 'WRONG_PASSWORD' };
                        }
                    }
                    return { success: false, error: 'NOT_FOUND' };
                }
                return { success: false, error: 'SERVER_ERROR' };
            } catch (err) {
                console.error('Login error:', err);
                return { success: false, error: 'NETWORK_ERROR' };
            }
        },

        async registerUser(newUser) {
            try {
                const payload = {
                    full_name: newUser.full_name,
                    email: newUser.email,
                    password_hash: newUser.password_hash,
                    role: newUser.role || 'user'
                };
                if (newUser.phone) {
                    payload.phone = newUser.phone;
                }
                
                const res = await fetch(`${BASE_URL}/users`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });

                if (!res.ok) return null;
                
                const data = await res.json();
                return data[0] || null;
            } catch (err) {
                console.error('Register error:', err);
                return null;
            }
        }
    };

    window.SupabaseService = SupabaseService;
})();
