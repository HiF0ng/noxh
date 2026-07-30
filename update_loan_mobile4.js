const fs = require('fs');

// 1. Update loan.html
let loanHtml = fs.readFileSync('loan.html', 'utf-8');
loanHtml = loanHtml.replace('min-w-[800px]', '');
loanHtml = loanHtml.replace(/px-4/g, 'px-2 md:px-4'); // Reduce padding back a bit on mobile
fs.writeFileSync('loan.html', loanHtml, 'utf-8');
console.log('Updated loan.html');

// 2. Update main.js
let mainJs = fs.readFileSync('assets/js/main.js', 'utf-8');
mainJs = mainJs.replace(/px-4/g, 'px-2 md:px-4');
fs.writeFileSync('assets/js/main.js', mainJs, 'utf-8');
console.log('Updated main.js');
