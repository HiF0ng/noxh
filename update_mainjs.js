const fs = require('fs');
let content = fs.readFileSync('assets/js/main.js', 'utf-8');

const oldLogic = `function setupProjectFilterSort() {
    const select = document.getElementById('project-filter-sort-select');
    const grid = document.getElementById('projects-grid');
    if (!select || !grid) return;
    
    // Get all project card items
    const cards = Array.from(grid.querySelectorAll('.project-card-item'));
    if (cards.length === 0) return;
    
    // Replace listener cleanly
    const newSelect = select.cloneNode(true);
    select.parentNode.replaceChild(newSelect, select);
    
    newSelect.addEventListener('change', () => {
        const val = newSelect.value;
        let visibleCount = 0;
        
        if (val === 'latest') {
            // Sort by date descending
            cards.sort((a, b) => (b.dataset.date || '').localeCompare(a.dataset.date || ''));
            cards.forEach(card => {
                card.style.display = '';
                visibleCount++;
            });
        } else if (val === 'price-asc') {
            // Sort by price ascending (putting zero/unknown prices at bottom)
            cards.sort((a, b) => {
                const pA = parseFloat(a.dataset.price) || 999;
                const pB = parseFloat(b.dataset.price) || 999;
                return pA - pB;
            });
            cards.forEach(card => {
                card.style.display = '';
                visibleCount++;
            });
        } else if (val === 'price-desc') {
            // Sort by price descending
            cards.sort((a, b) => {
                const pA = parseFloat(a.dataset.price) || 0;
                const pB = parseFloat(b.dataset.price) || 0;
                return pB - pA;
            });
            cards.forEach(card => {
                card.style.display = '';
                visibleCount++;
            });
        } else {
            // Filter by specific status (Chờ xây dựng, Đang xây dựng, Đang nhận đơn, Chờ bàn giao)
            cards.forEach(card => {
                const status = (card.dataset.status || '').trim();
                if (status === val) {
                    card.style.display = '';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });
        }
        
        // Re-append sorted/filtered cards into grid container
        cards.forEach(card => grid.appendChild(card));
        
        // Update Counter display text
        const visText = document.getElementById('visible-count-text');
        const totText = document.getElementById('total-count-text');
        if (visText) visText.textContent = visibleCount > 0 ? \`1 - \${visibleCount}\` : '0';
        if (totText) totText.textContent = visibleCount;
    });
}`;

const newLogic = `function setupProjectFilterSort() {
    const sortSelect = document.getElementById('project-filter-sort-select');
    const statusSelect = document.getElementById('sidebar-status-filter');
    const grid = document.getElementById('projects-grid');
    if (!sortSelect || !grid) return;
    
    // Get all project card items
    const cards = Array.from(grid.querySelectorAll('.project-card-item'));
    if (cards.length === 0) return;
    
    function updateGrid() {
        let visibleCount = 0;
        const sortVal = sortSelect.value;
        const statusVal = statusSelect ? statusSelect.value : 'all';
        
        // 1. Filter
        cards.forEach(card => {
            const status = (card.dataset.status || '').trim();
            if (statusVal === 'all' || status === statusVal) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        // 2. Sort
        if (sortVal === 'latest') {
            cards.sort((a, b) => (b.dataset.date || '').localeCompare(a.dataset.date || ''));
        } else if (sortVal === 'price-asc') {
            cards.sort((a, b) => {
                const pA = parseFloat(a.dataset.price) || 999;
                const pB = parseFloat(b.dataset.price) || 999;
                return pA - pB;
            });
        } else if (sortVal === 'price-desc') {
            cards.sort((a, b) => {
                const pA = parseFloat(a.dataset.price) || 0;
                const pB = parseFloat(b.dataset.price) || 0;
                return pB - pA;
            });
        }
        
        // Re-append sorted cards
        cards.forEach(card => grid.appendChild(card));
        
        // Update Counter
        const visText = document.getElementById('visible-count-text');
        const totText = document.getElementById('total-count-text');
        if (visText) visText.textContent = visibleCount > 0 ? \`1 - \${visibleCount}\` : '0';
        if (totText) totText.textContent = visibleCount;
    }
    
    const newSortSelect = sortSelect.cloneNode(true);
    sortSelect.parentNode.replaceChild(newSortSelect, sortSelect);
    newSortSelect.addEventListener('change', updateGrid);
    
    if (statusSelect) {
        const newStatusSelect = statusSelect.cloneNode(true);
        statusSelect.parentNode.replaceChild(newStatusSelect, statusSelect);
        newStatusSelect.addEventListener('change', updateGrid);
    }
}`;

if(content.includes(oldLogic)) {
    content = content.replace(oldLogic, newLogic);
    fs.writeFileSync('assets/js/main.js', content, 'utf-8');
    console.log("Updated main.js logic");
} else {
    console.log("oldLogic not found in main.js!");
}
