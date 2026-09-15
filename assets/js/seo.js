(function () {
    const BRAND = 'NOXH.help';
    const DEFAULT_IMAGE = '/img/CoverFB.jpg';
    const pages = {
        '/trang-chu': {
            title: `${BRAND} | Thông tin nhà ở xã hội Việt Nam`,
            description: 'Tra cứu dự án nhà ở xã hội, biểu mẫu và hướng dẫn đăng ký trên toàn quốc.',
            template: 'homepage.html'
        },
        '/du-an': {
            title: `Dự án nhà ở xã hội | ${BRAND}`,
            description: 'Danh sách dự án nhà ở xã hội đang cập nhật, kèm vị trí, tiến độ và thông tin đăng ký.',
            template: 'all-projects.html'
        },
        '/tai-lieu': {
            title: `Tài liệu và hướng dẫn đăng ký NOXH | ${BRAND}`,
            description: 'Tải biểu mẫu, văn bản pháp luật và hướng dẫn đăng ký nhà ở xã hội mới nhất.',
            template: 'documents.html'
        },
        '/cau-hoi-thuong-gap': {
            title: `Câu hỏi thường gặp về nhà ở xã hội | ${BRAND}`,
            description: 'Giải đáp điều kiện, hồ sơ, quy trình và những vấn đề thường gặp khi đăng ký nhà ở xã hội.',
            template: 'faq.html'
        },
        '/so-sanh': {
            title: `So sánh dự án nhà ở xã hội | ${BRAND}`,
            description: 'So sánh thông tin các dự án nhà ở xã hội để chọn phương án phù hợp.',
            template: 'compare.html'
        },
        '/tinh-khoan-vay': {
            title: `Tính khoản vay nhà ở xã hội | ${BRAND}`,
            description: 'Ước tính khoản vay và lịch trả góp khi mua nhà ở xã hội.',
            template: 'loan.html'
        },
        '/lien-he': {
            title: `Liên hệ hỗ trợ nhà ở xã hội | ${BRAND}`,
            description: 'Liên hệ với NOXH.help để nhận hỗ trợ thông tin về nhà ở xã hội.',
            template: 'contact.html'
        },
        '/ve-chung-toi': {
            title: `Về NOXH.help | Thông tin nhà ở xã hội`,
            description: 'Tìm hiểu mục tiêu và nguyên tắc cung cấp thông tin của NOXH.help.',
            template: 'about_us.html'
        },
        '/chinh-sach-bao-mat': {
            title: `Chính sách bảo mật | ${BRAND}`,
            description: 'Chính sách bảo mật và cách NOXH.help xử lý thông tin người dùng.',
            template: 'policy.html'
        },
        '/dieu-khoan-su-dung': {
            title: `Điều khoản sử dụng | ${BRAND}`,
            description: 'Điều khoản sử dụng dịch vụ và thông tin trên NOXH.help.',
            template: 'term_of_use.html'
        },
        '/huong-dan': {
            title: `Hướng dẫn đăng ký nhà ở xã hội | ${BRAND}`,
            description: 'Hướng dẫn các bước chuẩn bị hồ sơ và đăng ký nhà ở xã hội.',
            template: 'guide.html'
        },
        '/du-an/': {
            title: `Dự án nhà ở xã hội | ${BRAND}`,
            description: 'Thông tin chi tiết dự án nhà ở xã hội trên NOXH.help.',
            template: 'details.html'
        }
    };

    const templatePaths = Object.fromEntries(Object.entries(pages).map(([path, page]) => [page.template, path]));
    const privateTemplates = new Set([
        'admin.html', 'admin-login.html', 'login.html', 'signup.html', 'recover-password.html',
        'settings.html', 'saved.html', 'docs-guide.html', 'register_steps.html', 'working.html'
    ]);

    const getOrigin = () => window.location.origin.replace(/\/$/, '');
    const templateForPath = pathname => {
        const path = String(pathname || '/').replace(/\/+$/, '') || '/';
        if (path.startsWith('/du-an/')) return 'details.html';
        if (path === '/') return 'homepage.html';
        const direct = Object.entries(templatePaths).find(([, mappedPath]) => mappedPath === path);
        return direct ? direct[0] : path.split('/').pop() || 'homepage.html';
    };
    const projectPage = project => ({
        title: `${project.name || 'Dự án nhà ở xã hội'} | ${BRAND}`,
        description: String(project.desc || project.details?.desc || `Thông tin dự án ${project.name || ''}.`).replace(/\s+/g, ' ').trim().slice(0, 180),
        image: project.imageUrl || project.details?.mainImageUrl || DEFAULT_IMAGE,
        template: 'details.html'
    });
    const pageForPath = pathname => {
        const path = String(pathname || '/').replace(/\/+$/, '') || '/';
        if (path.startsWith('/du-an/')) {
            const requestedSlug = decodeURIComponent(path.split('/').filter(Boolean).pop() || '');
            const project = window.__NOXH_PRELOADED_PROJECT__;
            if (project && (project.slug === requestedSlug || (project.previousSlugs || []).includes(requestedSlug))) return projectPage(project);
            return pages['/du-an/'];
        }
        if (path === '/') return pages['/trang-chu'];
        return pages[path] || pages[templatePaths[templateForPath(pathname)]] || null;
    };
    const upsertMeta = (selector, attributes) => {
        let element = document.head.querySelector(selector);
        if (!element) {
            element = document.createElement('meta');
            document.head.appendChild(element);
        }
        Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
        return element;
    };
    const absoluteUrl = path => new URL(path, `${getOrigin()}/`).href;

    const apply = (pathname = window.location.pathname, project = null) => {
        const template = templateForPath(pathname);
        if (privateTemplates.has(template)) {
            upsertMeta('meta[name="robots"]', { name: 'robots', content: 'noindex, nofollow, noarchive' });
            return;
        }
        const page = project ? projectPage(project) : pageForPath(pathname);
        if (!page) return;
        const canonicalPath = String(pathname || '/').startsWith('/du-an/')
            ? String(pathname).replace(/\/+$/, '')
            : Object.entries(pages).find(([, value]) => value === page)?.[0] || '/trang-chu';
        const canonical = absoluteUrl(canonicalPath);
        document.title = page.title;
        upsertMeta('meta[name="description"]', { name: 'description', content: page.description });
        upsertMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow, max-image-preview:large' });
        let canonicalElement = document.head.querySelector('link[rel="canonical"]');
        if (!canonicalElement) {
            canonicalElement = document.createElement('link');
            canonicalElement.rel = 'canonical';
            document.head.appendChild(canonicalElement);
        }
        canonicalElement.href = canonical;
        upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
        upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'vi_VN' });
        upsertMeta('meta[property="og:title"]', { property: 'og:title', content: page.title });
        upsertMeta('meta[property="og:description"]', { property: 'og:description', content: page.description });
        upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
        upsertMeta('meta[property="og:image"]', { property: 'og:image', content: absoluteUrl(page.image || DEFAULT_IMAGE) });
        upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: page.image ? 'summary_large_image' : 'summary' });
        upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: page.title });
        upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: page.description });
        if (page.image) upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: absoluteUrl(page.image) });
    };

    window.NoxhSeo = { apply, applyProject: (project, pathname) => apply(pathname, project), pageForPath };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => apply());
    else apply();
    window.addEventListener('popstate', () => apply());
    window.addEventListener('pageshow', () => apply());
})();
