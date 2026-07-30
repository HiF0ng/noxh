const fs = require('fs');
const htmlFile = 'homepage.html';
let content = fs.readFileSync(htmlFile, 'utf-8');

// 1. Update feedbackModalContent
content = content.replace(
    '<div id="feedbackModalContent" class="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg mx-4 relative z-10 overflow-hidden transition-all duration-500 transform scale-95 flex flex-col">',
    '<div id="feedbackModalContent" class="bg-surface-container-lowest rounded-2xl shadow-2xl w-[calc(100%-3rem)] sm:w-[calc(100%-4rem)] md:w-full max-w-md lg:max-w-lg mx-auto relative z-10 overflow-hidden transition-all duration-500 transform scale-95 flex flex-col">'
);

// 2. Update supportModal
content = content.replace(
    '<div class="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-3xl mx-4 relative z-10 overflow-hidden transition-all duration-300 transform scale-95 flex flex-col md:flex-row">',
    '<div class="bg-surface-container-lowest rounded-2xl shadow-2xl w-[calc(100%-3rem)] sm:w-[calc(100%-4rem)] md:w-full max-w-2xl lg:max-w-3xl mx-auto relative z-10 overflow-hidden transition-all duration-300 transform scale-95 flex flex-col md:flex-row">'
);

// 3. Update heart icon
content = content.replace(
    '<div class="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">',
    '<div class="w-12 h-12 rounded-full bg-primary/10 text-primary hidden lg:flex items-center justify-center mb-6">'
);

// 4. Update "Chúng tôi cảm ơn..." text
content = content.replace(
    '<p class="font-body-lg text-body-lg text-on-surface leading-relaxed mb-8 italic text-on-surface-variant">',
    '<p class="font-body-lg text-[14px] md:text-body-lg text-on-surface-variant leading-relaxed mb-6 md:mb-8 italic text-balance">'
);

// 5. Update Bank Info box padding
content = content.replace(
    '<div class="flex flex-col gap-4 bg-surface-container-low p-5 rounded-xl border border-outline-variant/50">',
    '<div class="flex flex-col gap-4 bg-surface-container-low p-4 md:p-5 rounded-xl border border-outline-variant/50">'
);

// 6. Update Bank Info lines
content = content.replace(
    '<div class="flex justify-between items-center flex-wrap gap-2">\n                    <span class="text-sm text-on-surface-variant">Người thụ hưởng:</span>\n                    <span class="font-bold text-on-surface">Vietnam Housing</span>\n                </div>',
    '<div class="flex justify-between items-center gap-2">\n                    <span class="text-[12px] md:text-sm text-on-surface-variant whitespace-nowrap">Người thụ hưởng:</span>\n                    <span class="font-bold text-[13px] md:text-base text-on-surface text-right">Vietnam Housing</span>\n                </div>'
);

content = content.replace(
    '<div class="flex justify-between items-center flex-wrap gap-2">\n                    <span class="text-sm text-on-surface-variant">Số tài khoản:</span>\n                    <div class="flex items-center gap-2">\n                        <span class="font-bold text-primary text-lg">1234567890</span>\n                    </div>\n                </div>',
    '<div class="flex justify-between items-center gap-2">\n                    <span class="text-[12px] md:text-sm text-on-surface-variant whitespace-nowrap">Số tài khoản:</span>\n                    <div class="flex items-center gap-2">\n                        <span class="font-bold text-primary text-base md:text-lg">1234567890</span>\n                    </div>\n                </div>'
);

content = content.replace(
    '<div class="flex justify-between items-center flex-wrap gap-2">\n                    <span class="text-sm text-on-surface-variant">Ngân hàng:</span>\n                    <span class="font-bold text-on-surface text-right">Vietcombank<br><span class="text-xs font-normal opacity-80">Chi nhánh Sở Giao Dịch</span></span>\n                </div>',
    '<div class="flex justify-between items-center gap-2">\n                    <span class="text-[12px] md:text-sm text-on-surface-variant whitespace-nowrap">Ngân hàng:</span>\n                    <span class="font-bold text-[13px] md:text-base text-on-surface text-right">Vietcombank<br><span class="text-[10px] md:text-xs font-normal opacity-80">Chi nhánh Sở Giao Dịch</span></span>\n                </div>'
);

fs.writeFileSync(htmlFile, content, 'utf-8');
console.log("Updated modals in homepage.html");
