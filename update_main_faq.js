const fs = require('fs');
let content = fs.readFileSync('assets/js/main.js', 'utf-8');

const faqLogicAdd = `
    const categorySelect = document.getElementById('faq-category-select');
    if (categorySelect) {
        categorySelect.addEventListener('change', (e) => {
            const targetId = e.target.value;
            // Find the button with this target and click it
            const targetBtn = Array.from(document.querySelectorAll('.faq-tab-btn')).find(b => b.getAttribute('data-target') === targetId);
            if (targetBtn) targetBtn.click();
        });
    }
`;

if (!content.includes('faq-category-select')) {
    content = content.replace('if (tabBtns.length === 0) return;', 'if (tabBtns.length === 0) return;' + faqLogicAdd);
    fs.writeFileSync('assets/js/main.js', content, 'utf-8');
    console.log("Updated main.js with FAQ dropdown logic.");
} else {
    console.log("faq-category-select logic already present in main.js");
}
