import fs from 'node:fs/promises';

const publicPages = {
  'homepage.html': ['/trang-chu', 'NOXH.help | Thông tin nhà ở xã hội Việt Nam', 'Tra cứu dự án nhà ở xã hội, biểu mẫu và hướng dẫn đăng ký trên toàn quốc.'],
  'all-projects.html': ['/du-an', 'Dự án nhà ở xã hội | NOXH.help', 'Danh sách dự án nhà ở xã hội đang cập nhật, kèm vị trí, tiến độ và thông tin đăng ký.'],
  'details.html': ['/du-an', 'Dự án nhà ở xã hội | NOXH.help', 'Thông tin chi tiết dự án nhà ở xã hội trên NOXH.help.'],
  'documents.html': ['/tai-lieu', 'Tài liệu và hướng dẫn đăng ký NOXH | NOXH.help', 'Tải biểu mẫu, văn bản pháp luật và hướng dẫn đăng ký nhà ở xã hội mới nhất.'],
  'faq.html': ['/cau-hoi-thuong-gap', 'Câu hỏi thường gặp về nhà ở xã hội | NOXH.help', 'Giải đáp điều kiện, hồ sơ, quy trình và những vấn đề thường gặp khi đăng ký nhà ở xã hội.'],
  'compare.html': ['/so-sanh', 'So sánh dự án nhà ở xã hội | NOXH.help', 'So sánh thông tin các dự án nhà ở xã hội để chọn phương án phù hợp.'],
  'loan.html': ['/tinh-khoan-vay', 'Tính khoản vay nhà ở xã hội | NOXH.help', 'Ước tính khoản vay và lịch trả góp khi mua nhà ở xã hội.'],
  'contact.html': ['/lien-he', 'Liên hệ hỗ trợ nhà ở xã hội | NOXH.help', 'Liên hệ với NOXH.help để nhận hỗ trợ thông tin về nhà ở xã hội.'],
  'about_us.html': ['/ve-chung-toi', 'Về NOXH.help | Thông tin nhà ở xã hội', 'Tìm hiểu mục tiêu và nguyên tắc cung cấp thông tin của NOXH.help.'],
  'policy.html': ['/chinh-sach-bao-mat', 'Chính sách bảo mật | NOXH.help', 'Chính sách bảo mật và cách NOXH.help xử lý thông tin người dùng.'],
  'term_of_use.html': ['/dieu-khoan-su-dung', 'Điều khoản sử dụng | NOXH.help', 'Điều khoản sử dụng dịch vụ và thông tin trên NOXH.help.'],
  'guide.html': ['/huong-dan', 'Hướng dẫn đăng ký nhà ở xã hội | NOXH.help', 'Hướng dẫn các bước chuẩn bị hồ sơ và đăng ký nhà ở xã hội.']
};

const privatePages = [
  'admin.html', 'admin-dashboard.html', 'admin-docs-guide.html', 'admin-docs-new.html', 'admin-docs.html',
  'admin-faq.html', 'admin-login.html', 'admin-news-new.html', 'admin-news.html', 'admin-prj-new.html',
  'admin-prj.html', 'admin-user.html', 'docs-guide.html', 'login.html', 'recover-password.html',
  'register_steps.html', 'saved.html', 'settings.html', 'signup.html', 'working.html'
];

const escapeHtml = value => String(value)
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');
const removeSeoBlock = html => html.replace(/\s*<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/g, '');
const publicBlock = ([path, title, description]) => `
<!-- SEO:START -->
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${path}">
<meta property="og:type" content="website">
<meta property="og:locale" content="vi_VN">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${path}">
<meta property="og:image" content="/img/CoverFB.jpg">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<!-- SEO:END -->`;
const privateBlock = `
<!-- SEO:START -->
<meta name="robots" content="noindex, nofollow, noarchive">
<!-- SEO:END -->`;

for (const [file, metadata] of Object.entries(publicPages)) {
  let html = removeSeoBlock(await fs.readFile(file, 'utf8'));
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata[1])}</title>${publicBlock(metadata)}`);
  if (!html.includes('assets/js/seo.js')) html = html.replace(/<\/head>/i, `  <script src="assets/js/seo.js?v=1"></script>\n</head>`);
  await fs.writeFile(file, html, 'utf8');
}

for (const file of privatePages) {
  let html = removeSeoBlock(await fs.readFile(file, 'utf8'));
  if (/<\/title>/i.test(html)) html = html.replace(/<\/title>/i, `</title>${privateBlock}`);
  else html = html.replace(/<\/head>/i, `${privateBlock}\n</head>`);
  await fs.writeFile(file, html, 'utf8');
}

console.log(`Synchronized SEO metadata for ${Object.keys(publicPages).length} public pages and ${privatePages.length} private pages.`);
