const fs = require('fs');
let content = fs.readFileSync('all-projects.html', 'utf-8');

// Container padding and gap
content = content.replace('p-md flex flex-col gap-sm sticky', 'p-3 md:p-md flex flex-col gap-2 md:gap-sm sticky');

// Section gaps
content = content.replace(/gap-base/g, 'gap-1 md:gap-base');

// Inputs py-2 -> py-1.5 md:py-2
// Search input
content = content.replace('pl-10 pr-3 py-2 bg-surface', 'pl-10 pr-3 py-1.5 md:py-2 bg-surface');
// Province/District/Price dropdowns
content = content.replace(/px-3 py-2 bg-surface/g, 'px-3 py-1.5 md:py-2 bg-surface');
// Status dropdown
content = content.replace(/px-3 py-2 bg-surface-container-lowest/g, 'px-3 py-1.5 md:py-2 bg-surface-container-lowest');

fs.writeFileSync('all-projects.html', content, 'utf-8');
console.log("Updated spacing in filter box");
