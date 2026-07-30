const fs = require('fs');

// --- loan.html ---
let loanContent = fs.readFileSync('loan.html', 'utf-8');

// 1. Bold headers
loanContent = loanContent.replace(/text-title-lg md:text-headline-md font-headline-md/g, 'text-title-lg md:text-headline-md font-headline-md font-bold');

// 2 & 3. Reduce margins in Info box and Results box further on mobile
loanContent = loanContent.replace(/mb-4 md:mb-lg/g, 'mb-2 md:mb-lg');
loanContent = loanContent.replace(/mb-2 md:mb-sm/g, 'mb-1 md:mb-sm');

// 4. Increase table width to give more space for columns
loanContent = loanContent.replace('min-w-[500px]', 'min-w-[700px]');
// Increase padding inside table header on mobile
loanContent = loanContent.replace(/px-1 md:px-2/g, 'px-3');

// 5. Reduce font size of Note
loanContent = loanContent.replace('<p class="font-body-md text-body-md">Đây chỉ là tính toán sơ bộ', '<p class="font-body-sm text-[12px] md:text-body-md leading-relaxed">Đây chỉ là tính toán sơ bộ');

fs.writeFileSync('loan.html', loanContent, 'utf-8');
console.log("Updated loan.html");

// --- documents.html ---
let docsContent = fs.readFileSync('documents.html', 'utf-8');
// Reduce font size of description
docsContent = docsContent.replace('text-[13px] md:text-body-md text-on-surface-variant max-w-4xl mx-auto text-balance', 'text-[12px] md:text-body-md text-on-surface-variant max-w-4xl mx-auto text-balance leading-relaxed');
fs.writeFileSync('documents.html', docsContent, 'utf-8');
console.log("Updated documents.html");
