const fs = require('fs');
let content = fs.readFileSync('documents.html', 'utf-8');
content = content.replace(/border-outline-variant\/30 p-4 rounded-lg hover:bg-surface-container-low transition-colors flex items-center justify-between group/g, 
'border-primary p-4 rounded-lg hover:bg-surface-container-low transition-colors flex items-center justify-between group');
fs.writeFileSync('documents.html', content, 'utf-8');
console.log("Updated borders in documents.html");
