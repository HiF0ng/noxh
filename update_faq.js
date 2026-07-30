const fs = require('fs');
let content = fs.readFileSync('faq.html', 'utf-8');

// 1. Search Bar Updates
const oldSearchBar = `<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span class="material-symbols-outlined text-outline" data-icon="search">search</span>
                        </div>
                        <input id="faq-search-input" class="w-full pl-12 pr-4 py-4 rounded-full border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 font-body-md text-body-md bg-transparent" placeholder="Bạn cần tìm gì? (VD: Lãi suất vay, Thủ tục...)" type="text">
                        <button id="faq-search-btn" class="absolute inset-y-1 right-1 bg-primary text-on-primary font-label-md text-label-md px-6 rounded-full hover:bg-surface-tint transition-colors">
                            Tìm kiếm
                        </button>`;

const newSearchBar = `<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span class="material-symbols-outlined text-outline" data-icon="search">search</span>
                        </div>
                        <input id="faq-search-input" class="w-full pl-12 pr-14 py-4 rounded-full border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 font-body-md text-body-md bg-transparent" placeholder="Bạn cần tìm gì?" type="text">
                        <button id="faq-search-btn" class="absolute inset-y-1 right-1 bg-primary text-on-primary w-12 flex items-center justify-center rounded-full hover:bg-surface-tint transition-colors">
                            <span class="material-symbols-outlined">search</span>
                        </button>`;

content = content.replace(oldSearchBar, newSearchBar);

// 2. Categories Dropdown for Mobile
const oldNav = `<nav class="flex flex-col gap-2">`;
const newNav = `<select id="faq-category-select" class="lg:hidden w-full px-4 py-3 bg-primary text-white rounded-lg border-none font-label-md text-label-md outline-none mb-4 cursor-pointer appearance-none bg-[url('data:image/svg+xml;utf8,<svg fill=%22white%22 height=%2224%22 viewBox=%220 0 24 24%22 width=%2224%22 xmlns=%22http://www.w3.org/2000/svg%22><path d=%22M7 10l5 5 5-5z%22/></svg>')] bg-no-repeat bg-[position:right_10px_center]">
                            <option value="doi-tuong">Đối tượng thụ hưởng</option>
                            <option value="dieu-kien-ho-so">Điều kiện, Hồ sơ & Quy trình</option>
                            <option value="vay-von">Vay vốn & Tài chính</option>
                            <option value="quyen-so-huu">Quyền sở hữu, Chuyển nhượng & Pháp lý</option>
                        </select>
                        <nav class="hidden lg:flex flex-col gap-2">`;

content = content.replace(oldNav, newNav);

// Also change the width of the aside to only be w-64 on lg
content = content.replace('<aside class="w-full md:w-64 flex-shrink-0">', '<aside class="w-full lg:w-64 flex-shrink-0">');

fs.writeFileSync('faq.html', content, 'utf-8');
console.log("Updated faq.html for search bar and category dropdown.");
