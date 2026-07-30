const fs = require('fs');

// 1. Update navbar.html CSS
let navHtml = fs.readFileSync('components/navbar.html', 'utf-8');
const oldCss = `  .nav-item.is-active .nav-text,
  .nav-item.dropdown-open .nav-text {
      max-width: 200px;
      opacity: 1;
      margin-left: 6px;
  }`;
const newCss = `  .nav-item.is-active .nav-text,
  .nav-item.dropdown-open .nav-text {
      max-width: 200px;
      opacity: 1;
      margin-left: 6px;
  }
  .nav-item.no-icon .nav-text {
      margin-left: 0 !important;
      transform: translateY(-1px); /* Fix vertical centering */
  }`;

if (navHtml.includes(oldCss)) {
    navHtml = navHtml.replace(oldCss, newCss);
    fs.writeFileSync('components/navbar.html', navHtml, 'utf-8');
    console.log("Updated navbar.html CSS");
} else {
    console.log("oldCss not found in navbar.html");
}

// 2. Update main.js
let mainJs = fs.readFileSync('assets/js/main.js', 'utf-8');
const oldJsBlock = `        if (functionPages[currentPage]) {
            if (iconEl) {
                // Hide icon completely for function pages
                iconEl.style.display = 'none';
            }
            if (textEl) textEl.textContent = functionPages[currentPage].text;
        } else {
            if (iconEl) {
                iconEl.style.display = '';
                iconEl.textContent = 'widgets';
            }
            if (textEl) textEl.textContent = 'Chức năng';
        }`;

const newJsBlock = `        if (functionPages[currentPage]) {
            if (iconEl) {
                // Hide icon completely for function pages
                iconEl.style.display = 'none';
            }
            if (textEl) textEl.textContent = functionPages[currentPage].text;
            btnFunctions.classList.add('no-icon');
        } else {
            if (iconEl) {
                iconEl.style.display = '';
                iconEl.textContent = 'widgets';
            }
            if (textEl) textEl.textContent = 'Chức năng';
            btnFunctions.classList.remove('no-icon');
        }`;

if (mainJs.includes(oldJsBlock)) {
    mainJs = mainJs.replace(oldJsBlock, newJsBlock);
    fs.writeFileSync('assets/js/main.js', mainJs, 'utf-8');
    console.log("Updated main.js logic");
} else {
    console.log("oldJsBlock not found in main.js");
}
