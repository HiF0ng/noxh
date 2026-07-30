const fs = require('fs');

let mainJsContent = fs.readFileSync('assets/js/main.js', 'utf-8');
mainJsContent = mainJsContent.replace(/<td class="py-3 px-1 md:px-2/g, '<td class="py-3 px-3');
fs.writeFileSync('assets/js/main.js', mainJsContent, 'utf-8');
console.log("Updated main.js td padding");
