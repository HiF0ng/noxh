const fs = require('fs');
let mainJsContent = fs.readFileSync('assets/js/main.js', 'utf-8');
mainJsContent = mainJsContent.replace(/px-3/g, 'px-4');
fs.writeFileSync('assets/js/main.js', mainJsContent, 'utf-8');
console.log("Updated main.js padding");
