// Simple mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const closeMenuBtn = document.getElementById('close-menu-btn');
        const sidebar = document.getElementById('sidebar');

        if(mobileMenuBtn && sidebar && closeMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.remove('-translate-x-full');
            });

            closeMenuBtn.addEventListener('click', () => {
                sidebar.classList.add('-translate-x-full');
            });
        }