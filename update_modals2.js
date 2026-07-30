const fs = require('fs');
const htmlFile = 'homepage.html';
let content = fs.readFileSync(htmlFile, 'utf-8');

// Use regex to match the lines and replace them
content = content.replace(
    /<div class="flex justify-between items-center flex-wrap gap-2">\s*<span class="text-sm text-on-surface-variant">Người thụ hưởng:<\/span>\s*<span class="font-bold text-on-surface">Vietnam Housing<\/span>\s*<\/div>/g,
    '<div class="flex justify-between items-center gap-2">\n                    <span class="text-[12px] md:text-sm text-on-surface-variant whitespace-nowrap">Người thụ hưởng:</span>\n                    <span class="font-bold text-[13px] md:text-base text-on-surface text-right">Vietnam Housing</span>\n                </div>'
);

content = content.replace(
    /<div class="flex justify-between items-center flex-wrap gap-2">\s*<span class="text-sm text-on-surface-variant">Số tài khoản:<\/span>\s*<div class="flex items-center gap-2">\s*<span class="font-bold text-primary text-lg">1234567890<\/span>\s*<\/div>\s*<\/div>/g,
    '<div class="flex justify-between items-center gap-2">\n                    <span class="text-[12px] md:text-sm text-on-surface-variant whitespace-nowrap">Số tài khoản:</span>\n                    <div class="flex items-center gap-2">\n                        <span class="font-bold text-primary text-base md:text-lg">1234567890</span>\n                    </div>\n                </div>'
);

content = content.replace(
    /<div class="flex justify-between items-center flex-wrap gap-2">\s*<span class="text-sm text-on-surface-variant">Ngân hàng:<\/span>\s*<span class="font-bold text-on-surface text-right">Vietcombank<br><span class="text-xs font-normal opacity-80">Chi nhánh Sở Giao Dịch<\/span><\/span>\s*<\/div>/g,
    '<div class="flex justify-between items-center gap-2">\n                    <span class="text-[12px] md:text-sm text-on-surface-variant whitespace-nowrap">Ngân hàng:</span>\n                    <span class="font-bold text-[13px] md:text-base text-on-surface text-right">Vietcombank<br><span class="text-[10px] md:text-xs font-normal opacity-80">Chi nhánh Sở Giao Dịch</span></span>\n                </div>'
);

fs.writeFileSync(htmlFile, content, 'utf-8');
console.log("Updated bank info using regex.");
