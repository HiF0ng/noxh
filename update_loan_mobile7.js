const fs = require('fs');
let content = fs.readFileSync('loan.html', 'utf-8');

// 1. Add min-h-0 to the right column container
content = content.replace(
    '<div class="lg:col-span-7 flex flex-col gap-lg">',
    '<div class="lg:col-span-7 flex flex-col gap-lg min-h-0">'
);

// 2. Add min-h-0 to the Schedule Section container
content = content.replace(
    '<div class="bg-surface-container-lowest rounded-xl shadow-level-1 p-4 md:p-md border border-outline-variant/30 flex-grow flex flex-col">',
    '<div class="bg-surface-container-lowest rounded-xl shadow-level-1 p-4 md:p-md border border-outline-variant/30 flex-grow flex flex-col min-h-0">'
);

// 3. Add min-h-0 to the table wrapper
content = content.replace(
    '<div class="overflow-x-auto overflow-y-auto no-scrollbar h-[400px] lg:h-0 lg:flex-1">',
    '<div class="overflow-x-auto overflow-y-auto no-scrollbar h-[400px] lg:h-0 lg:flex-1 min-h-0">'
);

fs.writeFileSync('loan.html', content, 'utf-8');
console.log("Updated min-h-0 to constrain right column height");
