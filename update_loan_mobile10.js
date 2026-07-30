const fs = require('fs');
let content = fs.readFileSync('loan.html', 'utf-8');

// We need to add one </div> before <!-- Warning Alert -->
// Since the previous script failed, the current HTML looks like this before Warning Alert:
// </div>
// <!-- Warning Alert -->

// Let's use regex to find <!-- Warning Alert --> and insert a </div> before it
content = content.replace(/<\/div>\s*<!-- Warning Alert -->/, '</div>\n</div>\n<!-- Warning Alert -->');

fs.writeFileSync('loan.html', content, 'utf-8');
console.log("Fixed missing closing div");
