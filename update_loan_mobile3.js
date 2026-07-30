const fs = require('fs');

let content = fs.readFileSync('loan.html', 'utf-8');

// 1. Remove table-fixed and w-1/5. Add table-auto and min-w-[800px] to ensure absolutely no overlap
content = content.replace('<table class="w-full border-collapse table-fixed">', '<table class="w-full border-collapse table-auto min-w-[800px]">');

// 2. Remove w-1/5 from all <th>
content = content.replace(/ w-1\/5/g, '');

// 3. Make padding even wider for columns to ensure they don't look crowded
content = content.replace(/px-3/g, 'px-4');

fs.writeFileSync('loan.html', content, 'utf-8');
console.log("Updated loan.html table widths and padding");
