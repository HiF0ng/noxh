const fs = require('fs');
let content = fs.readFileSync('faq.html', 'utf-8');

// 1. Remove search button and adjust padding
const searchBtn = `<button id="faq-search-btn" class="absolute inset-y-1 right-1 bg-primary text-on-primary w-12 flex items-center justify-center rounded-full hover:bg-surface-tint transition-colors">
                            <span class="material-symbols-outlined">search</span>
                        </button>`;
content = content.replace(searchBtn, '');
content = content.replace('pl-12 pr-14 py-4', 'pl-12 pr-4 py-4');

// 2. Adjust dropdown CSS
const oldSelect = `<select id="faq-category-select" class="lg:hidden w-full px-4 py-3 bg-primary text-white rounded-lg border-none font-label-md text-label-md outline-none mb-4 cursor-pointer appearance-none bg-[url('data:image/svg+xml;utf8,<svg fill=%22white%22 height=%2224%22 viewBox=%220 0 24 24%22 width=%2224%22 xmlns=%22http://www.w3.org/2000/svg%22><path d=%22M7 10l5 5 5-5z%22/></svg>')] bg-no-repeat bg-[position:right_10px_center]">`;
const newSelect = `<select id="faq-category-select" class="lg:hidden w-full px-4 py-2.5 bg-surface-container-lowest text-on-surface rounded border border-outline-variant focus:border-white focus:ring-0 font-label-md text-label-md outline-none mb-1 cursor-pointer appearance-none bg-[url('data:image/svg+xml;utf8,<svg fill=%22%23475569%22 height=%2224%22 viewBox=%220 0 24 24%22 width=%2224%22 xmlns=%22http://www.w3.org/2000/svg%22><path d=%22M7 10l5 5 5-5z%22/></svg>')] bg-no-repeat bg-[position:right_10px_center]">`;
content = content.replace(oldSelect, newSelect);

// 3. Reduce aside height and padding
content = content.replace('py-md px-2 border border-outline-variant', 'py-3 px-2 border border-outline-variant');
content = content.replace('mb-sm px-4', 'mb-2 px-4');
content = content.replace('<div class="flex flex-col md:flex-row gap-lg">', '<div class="flex flex-col md:flex-row gap-4 md:gap-lg">');

// 4. Reduce gap between FAQs on mobile
content = content.replace(/<div class="space-y-4">/g, '<div class="space-y-2 md:space-y-4">');

fs.writeFileSync('faq.html', content, 'utf-8');
console.log("Updated faq.html based on latest feedback.");
