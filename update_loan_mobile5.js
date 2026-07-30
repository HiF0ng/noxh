const fs = require('fs');

let content = fs.readFileSync('loan.html', 'utf-8');
content = content.replace('<div class="overflow-x-auto h-[400px] overflow-y-auto no-scrollbar">', '<div class="overflow-x-auto flex-1 min-h-[400px] overflow-y-auto no-scrollbar">');
fs.writeFileSync('loan.html', content, 'utf-8');
console.log("Updated loan.html table wrapper height");
