function toggleAccordion(button) {
            const content = button.nextElementSibling;
            const isExpanded = content.classList.contains('open');
            
            // Close all other accordions (optional, remove if you want multiple open)
            document.querySelectorAll('.accordion-content').forEach(el => {
                el.classList.remove('open');
                el.parentElement.classList.remove('border-primary', 'shadow-[0_8px_30px_rgb(0,0,0,0.08)]');
            });

            if (!isExpanded) {
                content.classList.add('open');
                button.parentElement.classList.add('border-primary', 'shadow-[0_8px_30px_rgb(0,0,0,0.08)]');
            }
        }