const fs = require('fs');
let content = fs.readFileSync('loan.html', 'utf-8');

// 1. Replace the opening of the right column
const oldRightColumnStart = '<div class="lg:col-span-7 flex flex-col gap-lg min-h-0">';
const newRightColumnStart = `<div class="lg:col-span-7 lg:relative">
    <div class="flex flex-col gap-lg min-h-0 lg:absolute lg:inset-0 w-full h-full">`;

content = content.replace(oldRightColumnStart, newRightColumnStart);

// 2. Add the extra closing div
// The exact block at the bottom is:
// </table>
// </div>
// </div>
// </div>
// </div>
// <!-- Warning Alert -->
// We need to change the 4 </div>s to 5 </div>s

const oldBottom = `</table>
</div>
</div>
</div>
</div>
<!-- Warning Alert -->`;

const newBottom = `</table>
</div>
</div>
</div>
</div>
</div>
<!-- Warning Alert -->`;

content = content.replace(oldBottom, newBottom);

fs.writeFileSync('loan.html', content, 'utf-8');
console.log("Updated loan.html layout");
