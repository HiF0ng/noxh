const fs = require('fs');
let content = fs.readFileSync('faq.html', 'utf-8');

// 1. Remove search button completely
const searchBtn = `<button id="faq-search-btn" class="absolute inset-y-1 right-1 bg-primary text-on-primary font-label-md text-label-md px-6 rounded-full hover:bg-surface-tint transition-colors">
                        Tìm kiếm
                    </button>`;
content = content.replace(searchBtn, '');
content = content.replace('pl-12 pr-4 py-4 rounded-full', 'pl-12 pr-4 py-4 rounded-full');
content = content.replace('placeholder="Bạn cần tìm gì? (VD: Lãi suất vay, Thủ tục...)"', 'placeholder="Bạn cần tìm gì?"');

// 2. Replace <select> with custom dropdown
const selectHtml = `<select id="faq-category-select" class="lg:hidden w-full px-4 py-3 bg-primary text-white rounded-lg border-none font-label-md text-label-md outline-none mb-4 cursor-pointer appearance-none bg-[url('data:image/svg+xml;utf8,<svg fill=%22white%22 height=%2224%22 viewBox=%220 0 24 24%22 width=%2224%22 xmlns=%22http://www.w3.org/2000/svg%22><path d=%22M7 10l5 5 5-5z%22/></svg>')] bg-no-repeat bg-[position:right_10px_center]">
                            <option value="doi-tuong">Đối tượng thụ hưởng</option>
                            <option value="dieu-kien-ho-so">Điều kiện, Hồ sơ & Quy trình</option>
                            <option value="vay-von">Vay vốn & Tài chính</option>
                            <option value="quyen-so-huu">Quyền sở hữu, Chuyển nhượng & Pháp lý</option>
                        </select>`;

const customDropdownHtml = `<div class="relative lg:hidden mb-2" id="custom-faq-dropdown-container">
                            <button id="custom-faq-dropdown-btn" class="w-full px-4 py-3 bg-surface-container-lowest text-on-surface rounded-2xl border border-outline-variant font-label-md text-label-md outline-none flex justify-between items-center transition-shadow focus:border-outline-variant focus:ring-0">
                                <span id="custom-faq-dropdown-text">Đối tượng thụ hưởng</span>
                                <span class="material-symbols-outlined text-outline">expand_more</span>
                            </button>
                            <div id="custom-faq-dropdown-menu" class="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.1)] z-50 hidden flex-col overflow-hidden">
                                <a href="javascript:void(0)" class="faq-dropdown-item px-4 py-3 font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors border-b border-outline-variant/30" data-target="doi-tuong">Đối tượng thụ hưởng</a>
                                <a href="javascript:void(0)" class="faq-dropdown-item px-4 py-3 font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors border-b border-outline-variant/30" data-target="dieu-kien-ho-so">Điều kiện, Hồ sơ & Quy trình</a>
                                <a href="javascript:void(0)" class="faq-dropdown-item px-4 py-3 font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors border-b border-outline-variant/30" data-target="vay-von">Vay vốn & Tài chính</a>
                                <a href="javascript:void(0)" class="faq-dropdown-item px-4 py-3 font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors" data-target="quyen-so-huu">Quyền sở hữu, Chuyển nhượng & Pháp lý</a>
                            </div>
                        </div>`;

content = content.replace(selectHtml, customDropdownHtml);

// 3. Adjust spacing/padding
content = content.replace('py-md px-2 border border-outline-variant', 'py-3 px-2 border border-outline-variant');
content = content.replace('mb-sm px-4', 'mb-2 px-4');
content = content.replace('<div class="flex flex-col md:flex-row gap-lg">', '<div class="flex flex-col md:flex-row gap-4 md:gap-lg">');

// 4. Reduce gap between FAQs on mobile
content = content.replace(/<div class="space-y-4">/g, '<div class="space-y-2 md:space-y-4">');

fs.writeFileSync('faq.html', content, 'utf-8');
console.log("Updated faq.html for custom dropdown and spacing");
