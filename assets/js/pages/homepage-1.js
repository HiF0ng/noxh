document.addEventListener("DOMContentLoaded", function() {
    const scrollBtn = document.getElementById("scroll-down-btn");
    if (scrollBtn) {
        scrollBtn.addEventListener("click", function(e) {
            e.preventDefault();
            const targetSection = document.getElementById("featured-projects");
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });
    }
});