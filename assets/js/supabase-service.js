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
                    desc: db.details_json?.desc || ''
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
                    details_json: { desc: projectData.desc || '' }
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
                    details_json: { desc: projectData.desc || '' }
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
                        phone: '', // Not in DB schema
                        date: new Date(db.created_at).toLocaleDateString('vi-VN'),
                        role: db.role || 'user',
                        avatarText: initials,
                        avatarBg: bgColors[index % bgColors.length]
                    };
                });
            } catch (err) {
                console.error(err);
                return [];
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
                const res = await fetch(`${BASE_URL}/faqs?select=*`, { headers: getHeaders() });
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
                const res = await fetch(`${BASE_URL}/users?email=eq.${encodeURIComponent(emailOrPhone)}&select=*`, { headers: getHeaders() });
                if (res && res.ok) {
                    const users = await res.json();
                    if (users && users.length > 0) {
                        return users[0];
                    }
                }
                return null;
            } catch (err) {
                console.error('Login error:', err);
                return null;
            }
        },

        async registerUser(newUser) {
            try {
                const res = await fetch(`${BASE_URL}/users`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(newUser)
                });
                return res.ok;
            } catch (err) {
                console.error('Register error:', err);
                return false;
            }
        }
    };

    window.SupabaseService = SupabaseService;
})();
