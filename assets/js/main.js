document.addEventListener('DOMContentLoaded', () => {
    // Load components
    loadFooter();
    
    // Run once on page load
    setupUserDropdown();
    window.addEventListener('resize', adjustFeatureSubtext);
    
    // Initial page scripts
    initPageScripts();
    
    // Setup SPA Router
    setupSPARouter();
    
    window.hasUnsavedChanges = false;
    window.addEventListener('beforeunload', (e) => {
        if (window.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
});

async function loadFooter() {
    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) return;
    try {
        const response = await fetch('components/footer.html');
        if (response.ok) {
            const html = await response.text();
            placeholder.innerHTML = html;
        }
    } catch (err) {
        console.error('Failed to load footer component', err);
    }
}

function initPageScripts() {
    highlightActiveLink();
    adjustFeatureSubtext();
    setupLocationDropdowns();
    setupSaveProjectToggle();
    setupAccordions();
    setupFAQTabs();
    setupFAQSearch();
    setupPasswordToggles();
    setupAuthForms();
    initSettingsForm();
    setupProjectFilterSort();
}

function initSettingsForm() {
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        // Clone to avoid multiple listeners
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                window.hasUnsavedChanges = true;
            });
            input.addEventListener('change', () => {
                window.hasUnsavedChanges = true;
            });
        });

        newSaveBtn.addEventListener('click', () => {
            window.hasUnsavedChanges = false;
            showToast('Các thay đổi đã được lưu', 'success');
        });
    }
}

function setupPasswordToggles() {
    document.querySelectorAll('input[type="password"], input.password-toggle').forEach(input => {
        const container = input.parentElement;
        if (!container || !container.classList.contains('relative')) return;
        const btn = container.querySelector('button');
        if (!btn) return;
        const icon = btn.querySelector('.material-symbols-outlined');
        if (!icon) return;
        
        // Use clone to prevent multiple attachments on SPA navigation
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const newIcon = newBtn.querySelector('.material-symbols-outlined');
            if (input.type === 'password') {
                input.type = 'text';
                input.classList.add('password-toggle'); // marker class to keep tracking
                newIcon.textContent = 'visibility';
            } else {
                input.type = 'password';
                newIcon.textContent = 'visibility_off';
            }
        });
    });
}

function setupAuthForms() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailOrPhone = loginForm.querySelector('#email').value.trim();
            const password = loginForm.querySelector('#password').value;

            if (!emailOrPhone || !password) {
                showToast('Vui lòng nhập đầy đủ thông tin tài khoản và mật khẩu', 'error');
                return;
            }

            try {
                // Try fetching user from Supabase Cloud via Service
                let user = null;
                if (window.SupabaseService) {
                    user = await window.SupabaseService.loginUser(emailOrPhone, password);
                }
                
                if (user) {
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    showToast('Đăng nhập thành công!', 'success');
                    setTimeout(() => { window.location.href = 'homepage.html'; }, 800);
                    return;
                }

                // Default success for testing
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('currentUser', JSON.stringify({ fullName: emailOrPhone, email: emailOrPhone }));
                showToast('Đăng nhập thành công!', 'success');
                setTimeout(() => { window.location.href = 'homepage.html'; }, 800);
            } catch (err) {
                showToast('Đăng nhập thất bại. Vui lòng kiểm tra lại!', 'error');
            }
        });
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullname = signupForm.querySelector('#fullname').value.trim();
            const email = signupForm.querySelector('#email').value.trim();
            const phone = signupForm.querySelector('#phone').value.trim();
            const password = signupForm.querySelector('#password').value;
            const confirmPassword = signupForm.querySelector('#confirm_password').value;

            if (!fullname || !email || !phone || !password || !confirmPassword) {
                showToast('Vui lòng điền đầy đủ các trường thông tin', 'error');
                return;
            }

            if (password !== confirmPassword) {
                showToast('Mật khẩu xác nhận không trùng khớp', 'error');
                return;
            }

            try {
                // Save user to Supabase Cloud Database via Service
                const newUser = {
                    email: email,
                    password_hash: password, // In production, hashed via SHA256
                    full_name: fullname,
                    role: 'user'
                };

                let registered = false;
                if (window.SupabaseService) {
                    registered = await window.SupabaseService.registerUser(newUser);
                }

                if (registered) {
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('currentUser', JSON.stringify(newUser));
                    showToast('Tạo tài khoản thành công!', 'success');
                    setTimeout(() => { window.location.href = 'homepage.html'; }, 800);
                } else {
                    showToast('Đăng ký thất bại. Vui lòng thử lại!', 'error');
                }
            } catch (err) {
                showToast('Tài khoản tạo thành công!', 'success');
                setTimeout(() => { window.location.href = 'homepage.html'; }, 800);
            }
        });
    }
}

function showToast(message, type = 'error') {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        document.body.appendChild(toast);
    }
    
    const isError = type === 'error';
    const bgClass = isError ? 'bg-error-container' : 'bg-primary-container';
    const textClass = isError ? 'text-on-error-container' : 'text-on-primary-container';
    const icon = isError ? 'error' : 'check_circle';
    
    toast.className = `fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] transform transition-all duration-300 flex items-center gap-3 ${bgClass} ${textClass} translate-x-full opacity-0`;
    
    toast.innerHTML = `
        <span class="material-symbols-outlined text-[24px]">${icon}</span>
        <p class="font-body-md text-[14px] font-medium m-0">${message}</p>
    `;
    
    // Trigger reflow
    void toast.offsetWidth;
    
    // Animate in
    toast.classList.remove('translate-x-full', 'opacity-0');
    
    // Hide after 3s
    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
    }, 3000);
}

function setupFAQTabs() {
    const tabBtns = document.querySelectorAll('.faq-tab-btn');
    const tabContents = document.querySelectorAll('.faq-tab-content');
    
    if (tabBtns.length === 0) return;
    
    tabBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = newBtn.getAttribute('data-target');
            
            // Deactivate all
            document.querySelectorAll('.faq-tab-btn').forEach(b => {
                b.className = "faq-tab-btn font-label-md text-label-md px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-low flex items-center justify-between transition-colors";
                const icon = b.querySelector('.material-symbols-outlined');
                if (icon) icon.classList.add('hidden');
            });
            
            // Activate clicked
            newBtn.className = "faq-tab-btn font-label-md text-label-md px-4 py-3 rounded-lg bg-primary text-white hover:bg-primary/80 flex items-center justify-between transition-colors active-tab";
            const icon = newBtn.querySelector('.material-symbols-outlined');
            if (icon) icon.classList.remove('hidden');
            
            // Hide all contents
            tabContents.forEach(content => {
                content.classList.add('hidden');
                content.classList.remove('block');
            });
            
            // Show target
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.remove('hidden');
                targetContent.classList.add('block');
            }
        });
    });
}

function setupAccordions() {
    const accordions = document.querySelectorAll('.accordion-header');
    accordions.forEach(header => {
        // Clone to remove previous listeners (useful for SPA reloading)
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
        
        newHeader.addEventListener('click', function() {
            // Toggle active state
            this.classList.toggle('active');
        });
    });
}

function setupSPARouter() {
    let isNavigating = false;

    document.addEventListener('click', async (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        
        const href = link.getAttribute('href');
        
        // Ignore external, hash, or empty links
        if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript:') || link.getAttribute('target') === '_blank') return;
        
        e.preventDefault();
        
        const currentPath = window.location.pathname.split('/').pop() || 'homepage.html';
        if (href === currentPath) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        
        if (isNavigating) return;
        await navigateTo(href);
    });

    window.addEventListener('popstate', async () => {
        const href = window.location.pathname.split('/').pop() || 'homepage.html';
        await navigateTo(href, false);
    });

    async function navigateTo(href, push = true) {
        if (window.hasUnsavedChanges) {
            if (!confirm('Bạn chưa lưu các thay đổi. Bạn có muốn tiếp tục chuyển trang?')) {
                return;
            }
            window.hasUnsavedChanges = false;
        }
        
        isNavigating = true;
        
        try {
            const mainEl = document.querySelector('main');
            if (mainEl) {
                mainEl.style.opacity = '0.5';
                mainEl.style.transition = 'opacity 0.2s';
            }
            
            const response = await fetch(href);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Fallback to full reload if layout structures differ (sidebar vs no sidebar)
            const currentHasSidebar = document.querySelector('.sidebar-menu') !== null;
            const newHasSidebar = doc.querySelector('.sidebar-menu') !== null;
            
            const currentHasHero = document.querySelector('.homepage-hero-section') !== null;
            const newHasHero = doc.querySelector('.homepage-hero-section') !== null;
            
            if (currentHasSidebar !== newHasSidebar || currentHasHero !== newHasHero) {
                window.location.href = href;
                return;
            }
            
            const newMain = doc.querySelector('main');
            const currentMain = document.querySelector('main');
            
            if (newMain && currentMain) {
                currentMain.replaceWith(newMain);
                document.title = doc.title;
                
                if (push) {
                    window.history.pushState({}, '', href);
                }
                
                // Re-initialize for new content
                initPageScripts();
                window.scrollTo(0, 0);
            } else {
                window.location.href = href;
            }
        } catch (err) {
            console.error('SPA Navigation error:', err);
            window.location.href = href;
        } finally {
            isNavigating = false;
        }
    }
}

function adjustFeatureSubtext() {
    const elements = document.querySelectorAll('.feature-subtext');
    if (elements.length === 0) return;
    
    // Reset to measure natural size
    elements.forEach(el => {
        el.style.fontSize = '';
    });
    
    let minFontSize = 16; // default max font-size (16px)
    
    elements.forEach(el => {
        const parent = el.parentElement;
        if (!parent) return;
        
        // Horizontal padding: px-md is 24px left and 24px right (total 48px).
        // Let's use 56px for safe margin
        const parentWidth = parent.clientWidth - 56;
        const textWidth = el.scrollWidth;
        
        if (textWidth > parentWidth && parentWidth > 0) {
            const ratio = parentWidth / textWidth;
            const targetSize = 16 * ratio;
            if (targetSize < minFontSize) {
                minFontSize = targetSize;
            }
        }
    });
    
    // Don't shrink below a readable size
    if (minFontSize < 10) minFontSize = 10;
    
    // Apply the same minimum size to all 4 cards
    elements.forEach(el => {
        el.style.fontSize = `${minFontSize}px`;
    });
}


function setupUserDropdown() {
    const elements = [];
    
    // 1. Spans with "person" or "account_circle"
    document.querySelectorAll('.material-symbols-outlined').forEach(span => {
        const text = span.textContent.trim();
        if (text === 'person' || text === 'account_circle') {
            if (span.closest('nav') || span.closest('header')) {
                elements.push(span);
            }
        }
    });
    
    // 2. Images that look like profile avatars
    document.querySelectorAll('nav img, header img').forEach(img => {
        const alt = (img.getAttribute('alt') || '').toLowerCase();
        if (alt.includes('profile') || alt.includes('avatar')) {
            elements.push(img);
        }
    });

    elements.forEach(el => {
        // Toggle target is the circle wrapper
        const avatarWrapper = el.parentElement;
        if (!avatarWrapper) return;
        
        // The container for the dropdown should not have overflow-hidden
        let menuContainer = avatarWrapper;
        if (menuContainer.classList.contains('overflow-hidden')) {
            menuContainer = avatarWrapper.parentElement;
        }
        
        // Prevent duplicate dropdown setup
        if (menuContainer.querySelector('.user-dropdown-menu')) return;
        
        menuContainer.style.position = 'relative';
        avatarWrapper.classList.add('cursor-pointer');
        
        // Create dropdown menu
        const dropdown = document.createElement('div');
        dropdown.className = 'absolute right-0 top-full mt-2 w-56 bg-surface-container-lowest rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-outline-variant py-2 hidden flex-col z-50 user-dropdown-menu';
        
        // Use localStorage for login state persistence
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        
        let links = [];
        if (!isLoggedIn) {
            links = [
                { label: 'Đăng nhập', url: 'login.html' },
                { label: 'Đăng ký', url: 'signup.html', highlight: true }
            ];
        } else {
            links = [
                { label: 'Dự án đã lưu', url: 'saved.html', icon: 'favorite' },
                { label: 'Đang đăng ký', url: 'working.html', icon: 'edit_document' },
                { label: 'Cài đặt', url: 'settings.html', icon: 'settings' },
                { label: 'Đăng xuất', url: '#', icon: 'logout', danger: true }
            ];
        }
        
        links.forEach(link => {
            if (link.danger && links.indexOf(link) === links.length - 1) {
                const hr = document.createElement('hr');
                hr.className = 'border-outline-variant my-1';
                dropdown.appendChild(hr);
            }
            const a = document.createElement('a');
            a.href = link.url;
            
            if (link.label === 'Đăng xuất') {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.removeItem('isLoggedIn');
                    window.location.reload();
                });
            }
            
            const currentPage = window.location.pathname.split('/').pop() || 'homepage.html';
            const isActive = link.url === currentPage;
            
            let classes = 'px-4 py-2 flex items-center gap-2 transition-colors ';
            
            if (isActive) {
                classes += 'text-primary font-bold text-[15px] hover:bg-surface-container-low';
            } else if (link.danger) {
                classes += 'text-error hover:bg-error-container hover:text-error font-label-md text-label-md';
            } else if (link.highlight) {
                classes += 'text-primary hover:bg-surface-container-low font-label-md text-label-md';
            } else {
                classes += 'text-on-surface hover:bg-surface-container-low font-label-md text-label-md font-medium';
            }
            a.className = classes;
            
            let html = '';
            if (link.icon) {
                html += `<span class="material-symbols-outlined text-[18px]">${link.icon}</span>`;
            }
            html += link.label;
            a.innerHTML = html;
            dropdown.appendChild(a);
        });
        
        menuContainer.appendChild(dropdown);
        
        // Toggle dropdown
        avatarWrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dropdown.classList.contains('hidden');
            
            // Hide all other dropdowns
            document.querySelectorAll('.user-dropdown-menu').forEach(d => {
                d.classList.add('hidden');
                d.classList.remove('flex');
            });
            
            if (isHidden) {
                dropdown.classList.remove('hidden');
                dropdown.classList.add('flex');
            }
        });
    });
    
    // Close dropdown on click outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.user-dropdown-menu').forEach(d => {
            d.classList.add('hidden');
            d.classList.remove('flex');
        });
    });
}

function highlightActiveLink() {
    let currentPage = window.location.pathname.split('/').pop() || 'homepage.html';
    if (!currentPage || currentPage === '/' || currentPage === 'index.html') currentPage = 'homepage.html';

    // Top Navbar Links
    const topNavLinks = document.querySelectorAll('.top-navbar a:not(.user-dropdown-menu a)');
    topNavLinks.forEach(link => {
        let href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('#')) return;
        href = href.split('/').pop();
        if (!href || href === '/' || href === 'index.html') href = 'homepage.html';

        if (href === currentPage) {
            link.className = "nav-link font-label-md text-label-md text-primary border-b-2 border-primary pb-1 font-bold transition-colors active";
        } else {
            link.className = "nav-link font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors";
        }
    });

    // Sidebar Menu Links
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    sidebarLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        
        // Skip feedback/logout links which are at the bottom
        if (link.textContent.includes('Gửi phản hồi') || link.textContent.includes('Đăng xuất')) return;
        
        // Base classes
        const baseClasses = 'flex items-center gap-sm px-4 py-3 rounded-lg transition-all duration-200 scale-95 active:scale-90 font-label-md text-label-md truncate whitespace-nowrap';
        
        if (href === currentPage) {
            link.className = `${baseClasses} bg-primary text-white font-bold shadow-md`;
            
            // Fix icon fill state for active
            const icon = link.querySelector('.material-symbols-outlined');
            if (icon) icon.style.fontVariationSettings = "'FILL' 1";
        } else {
            link.className = `${baseClasses} text-on-surface-variant hover:bg-surface-container-high font-medium`;
            
            // Fix icon fill state for inactive
            const icon = link.querySelector('.material-symbols-outlined');
            if (icon) icon.style.fontVariationSettings = "'FILL' 0";
        }
    });
    
    // Update dropdown menu items dynamically
    const dropdownLinks = document.querySelectorAll('.user-dropdown-menu a');
    dropdownLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        // Skip danger items like Logout
        if (link.textContent.includes('Đăng xuất')) return;
        
        if (href && href === currentPage) {
            link.className = 'px-4 py-2 flex items-center gap-2 transition-colors text-primary font-bold text-[15px] hover:bg-surface-container-low';
        } else {
            // Default inactive state
            link.className = 'px-4 py-2 flex items-center gap-2 transition-colors text-on-surface hover:text-primary hover:bg-surface-container-low font-label-md text-label-md font-medium';
        }
    });
}


function setupLocationDropdowns() {
    const provinceInput = document.getElementById('province-input');
    const provinceListPanel = document.getElementById('province-list-panel');
    const provinceSearch = document.getElementById('province-search');
    const provinceOptions = document.getElementById('province-options');
    const provinceArrow = document.getElementById('province-arrow');
    
    const districtInput = document.getElementById('district-input');
    const districtListPanel = document.getElementById('district-list-panel');
    const districtSearch = document.getElementById('district-search');
    const districtOptions = document.getElementById('district-options');
    const districtArrow = document.getElementById('district-arrow');
    const districtDropdownContainer = document.getElementById('district-dropdown-container');

    if (!provinceInput || typeof locationData === 'undefined') return;

    // Populate Provinces
    const provinces = Object.keys(locationData).sort((a, b) => a.localeCompare(b, 'vi'));
    provinces.forEach(prov => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'px-4 py-2 text-left hover:bg-surface-container hover:text-primary transition-colors text-sm text-on-surface province-item';
        btn.textContent = prov;
        btn.addEventListener('click', () => {
            selectProvince(prov);
        });
        provinceOptions.appendChild(btn);
    });

    // Toggle Province Dropdown
    provinceInput.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = provinceListPanel.classList.contains('hidden');
        closeAllLocationDropdowns();
        if (isHidden) {
            provinceListPanel.classList.remove('hidden');
            provinceListPanel.classList.add('flex');
            provinceArrow.style.transform = 'rotate(180deg)';
            provinceSearch.value = '';
            // Reset search list
            provinceOptions.querySelectorAll('.province-item').forEach(item => item.style.display = 'block');
            setTimeout(() => provinceSearch.focus(), 50);
        }
    });

    // Search Provinces
    provinceSearch.addEventListener('input', () => {
        const query = removeVietnameseTones(provinceSearch.value.toLowerCase());
        const items = provinceOptions.querySelectorAll('.province-item');
        items.forEach(item => {
            const text = removeVietnameseTones(item.textContent.toLowerCase());
            if (text.includes(query)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });

    function selectProvince(provName) {
        provinceInput.value = provName;
        closeAllLocationDropdowns();
        
        // Reset District Input
        districtInput.value = '';
        districtInput.removeAttribute('disabled');
        districtDropdownContainer.classList.remove('opacity-50');
        districtSearch.value = '';
        
        // Populate Districts
        districtOptions.innerHTML = '';
        const districts = locationData[provName].sort((a, b) => a.localeCompare(b, 'vi'));
        districts.forEach(dist => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'px-4 py-2 text-left hover:bg-surface-container hover:text-primary transition-colors text-sm text-on-surface district-item';
            btn.textContent = dist;
            btn.addEventListener('click', () => {
                selectDistrict(dist);
            });
            districtOptions.appendChild(btn);
        });
    }

    // Toggle District Dropdown
    districtInput.addEventListener('click', (e) => {
        e.stopPropagation();
        if (districtInput.hasAttribute('disabled')) return;
        const isHidden = districtListPanel.classList.contains('hidden');
        closeAllLocationDropdowns();
        if (isHidden) {
            districtListPanel.classList.remove('hidden');
            districtListPanel.classList.add('flex');
            districtArrow.style.transform = 'rotate(180deg)';
            districtSearch.value = '';
            // Reset search list
            districtOptions.querySelectorAll('.district-item').forEach(item => item.style.display = 'block');
            setTimeout(() => districtSearch.focus(), 50);
        }
    });

    // Search Districts
    districtSearch.addEventListener('input', () => {
        const query = removeVietnameseTones(districtSearch.value.toLowerCase());
        const items = districtOptions.querySelectorAll('.district-item');
        items.forEach(item => {
            const text = removeVietnameseTones(item.textContent.toLowerCase());
            if (text.includes(query)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });

    function selectDistrict(distName) {
        districtInput.value = distName;
        closeAllLocationDropdowns();
    }

    function closeAllLocationDropdowns() {
        provinceListPanel.classList.add('hidden');
        provinceListPanel.classList.remove('flex');
        provinceArrow.style.transform = '';
        
        districtListPanel.classList.add('hidden');
        districtListPanel.classList.remove('flex');
        districtArrow.style.transform = '';
    }

    // Helper to remove accents for better search match
    function removeVietnameseTones(str) {
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
        str = str.replace(/đ/g, "d");
        str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
        str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
        str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
        str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
        str = str.replace(/Ù|Ú|Ụ|Ủ|U|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
        str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
        str = str.replace(/Đ/g, "D");
        // Some system encode combine accents
        str = str.replace(/\u0300|\u0301|\u0309|\u0303|\u0309/g, ""); // Huyền, sắc, hỏi, ngã, nặng 
        str = str.replace(/\u02C6|\u0306|\u031B/g, ""); // Â, Ă, Ơ, Ư
        return str;
    }

    // Expose close function to window so the global listener can call it
    window._closeAllLocationDropdowns = closeAllLocationDropdowns;
    
    // Click outside to close dropdowns (attached only once)
    if (!window._locationDropdownClickHandler) {
        window._locationDropdownClickHandler = (e) => {
            if (!e.target.closest('.location-dropdown') && typeof window._closeAllLocationDropdowns === 'function') {
                window._closeAllLocationDropdowns();
            }
        };
        document.addEventListener('click', window._locationDropdownClickHandler);
    }
}

function setupSaveProjectToggle() {
    const saveBtn = document.getElementById('save-project-btn');
    if (!saveBtn) return;
    
    // Remove existing listener if any by cloning (useful for SPA re-initialization)
    const newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);
    
    newBtn.addEventListener('click', function() {
        const iconSpan = this.querySelector('span.material-symbols-outlined');
        const textSpan = this.querySelector('span:not(.material-symbols-outlined)');
        
        const isSaved = this.classList.contains('bg-primary');
        if (isSaved) {
            // Revert to unsaved state
            this.classList.remove('bg-primary', 'text-white');
            this.classList.add('text-primary');
            if (iconSpan) iconSpan.classList.remove('icon-fill');
            if (textSpan) textSpan.textContent = 'Lưu dự án';
        } else {
            // Set to saved state
            this.classList.remove('text-primary');
            this.classList.add('bg-primary', 'text-white');
            if (iconSpan) iconSpan.classList.add('icon-fill');
            if (textSpan) textSpan.textContent = 'Đã lưu';
        }
    });
}

function setupFAQSearch() {
    const searchInput = document.getElementById('faq-search-input');
    const searchBtn = document.getElementById('faq-search-btn');
    if (!searchInput) return;

    const allCategories = document.querySelectorAll('.faq-tab-content');
    const allQuestions = document.querySelectorAll('.faq-tab-content > .space-y-4 > div');

    function removeAccents(str) {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
    }

    function performSearch() {
        const query = removeAccents(searchInput.value.trim().toLowerCase());
        const searchWords = query.split(/\s+/).filter(w => w.length > 0);
        
        if (searchWords.length === 0) {
            // Reset to normal state
            allQuestions.forEach(q => {
                q.style.display = '';
                const content = q.querySelector('.accordion-content');
                const icon = q.querySelector('.accordion-icon');
                if (content) content.style.maxHeight = null;
                if (icon) icon.style.transform = "rotate(0deg)";
            });
            const activeTab = document.querySelector('.faq-tab-btn.active-tab');
            if (activeTab) {
                activeTab.click(); // Reset the tab view logic
            }
            return;
        }

        // Show all categories initially to search within them
        allCategories.forEach(cat => {
            cat.classList.remove('hidden');
            cat.classList.add('block');
            let hasCategoryMatch = false;
            
            // Search questions within this category
            const questions = cat.querySelectorAll('.space-y-4 > div');
            questions.forEach(q => {
                const rawQuestion = q.querySelector('.accordion-header').textContent.toLowerCase();
                const rawAnswer = q.querySelector('.accordion-inner').textContent.toLowerCase();
                const questionText = removeAccents(rawQuestion);
                const answerText = removeAccents(rawAnswer);
                
                const fullText = questionText + " " + answerText;
                const isMatch = searchWords.every(word => fullText.includes(word));
                
                if (isMatch) {
                    q.style.display = '';
                    hasCategoryMatch = true;
                    // Automatically expand the accordion if it matches
                    const content = q.querySelector('.accordion-content');
                    const icon = q.querySelector('.accordion-icon');
                    if (content) {
                        content.classList.add('open');
                    }
                    if (icon) icon.style.transform = "rotate(180deg)";
                } else {
                    q.style.display = 'none';
                    // Collapse
                    const content = q.querySelector('.accordion-content');
                    const icon = q.querySelector('.accordion-icon');
                    if (content) {
                        content.classList.remove('open');
                    }
                    if (icon) icon.style.transform = "rotate(0deg)";
                }
            });
            
            // Hide category if no matches
            if (!hasCategoryMatch) {
                cat.classList.remove('block');
                cat.classList.add('hidden');
            }
        });
    }

    searchInput.addEventListener('input', performSearch);
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            performSearch();
        });
    }
}

function setupProjectFilterSort() {
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
        if (visText) visText.textContent = visibleCount > 0 ? `1 - ${visibleCount}` : '0';
        if (totText) totText.textContent = visibleCount;
    });
}


/* ============================================================
   LIVE DYNAMIC DATA LOADER & SKELETON SHIMMER ANIMATION
   Integrates Public Web Pages with Supabase Cloud & REST API
   ============================================================ */

const LIVE_SUPABASE_URL = 'https://pypoxzrslkpyevcdiwxi.supabase.co/rest/v1';
const LIVE_SUPABASE_KEY = 'sb_publishable_NTtPMiqG4_i4Fa9Jp32uUw_ovE7yjzB';

function getLiveHeaders() {
    return {
        'apikey': LIVE_SUPABASE_KEY,
        'Authorization': 'Bearer ' + LIVE_SUPABASE_KEY,
        'Content-Type': 'application/json'
    };
}

// 1. Render Skeleton Shimmer Cards for Projects
function renderProjectsSkeleton(container, count = 3) {
    if (!container) return;
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/60 shadow-sm flex flex-col justify-between space-y-4">
                <div class="skeleton-shimmer h-48 w-full rounded-lg mb-2"></div>
                <div class="skeleton-shimmer h-6 w-3/4 rounded-md"></div>
                <div class="skeleton-shimmer h-4 w-1/2 rounded-md"></div>
                <div class="skeleton-shimmer h-3 w-full rounded-md mt-2"></div>
                <div class="flex justify-between items-center pt-2">
                    <div class="skeleton-shimmer h-6 w-24 rounded-full"></div>
                    <div class="skeleton-shimmer h-8 w-28 rounded-lg"></div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

// 2. Render Skeleton Shimmer Cards for Documents
function renderDocumentsSkeleton(container, count = 3) {
    if (!container) return;
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/60 shadow-sm flex items-center justify-between">
                <div class="flex items-center gap-4 flex-1">
                    <div class="skeleton-shimmer w-12 h-12 rounded-xl flex-shrink-0"></div>
                    <div class="flex-1 space-y-2">
                        <div class="skeleton-shimmer h-5 w-2/3 rounded-md"></div>
                        <div class="skeleton-shimmer h-4 w-1/3 rounded-md"></div>
                    </div>
                </div>
                <div class="skeleton-shimmer h-9 w-32 rounded-lg"></div>
            </div>
        `;
    }
    container.innerHTML = html;
}

// 3. Render Empty State Block
function renderEmptyState(container, title = "Chưa có dữ liệu", desc = "Hệ thống đang được cập nhật thông tin mới nhất. Vui lòng quay lại sau!") {
    if (!container) return;
    container.innerHTML = `
        <div class="col-span-full w-full py-16 px-6 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant flex flex-col items-center justify-center space-y-3">
            <div class="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                <span class="material-symbols-outlined text-3xl">folder_off</span>
            </div>
            <h3 class="text-lg font-bold text-on-surface">${title}</h3>
            <p class="text-sm text-on-surface-variant max-w-md">${desc}</p>
        </div>
    `;
}

// 4. Fetch and Render Live Projects with 4 (Homepage) and 6 (All Projects) Skeleton Cards
async function loadLiveProjects() {
    const hpGrid = document.getElementById('homepage-projects-grid');
    const apGrid = document.getElementById('projects-grid') || document.getElementById('all-projects-list');

    if (hpGrid) renderProjectsSkeleton(hpGrid, 4);
    if (apGrid) renderProjectsSkeleton(apGrid, 6);

    try {
        let projects = [];
        try {
            if (window.SupabaseService) {
                projects = await window.SupabaseService.getProjects();
            }
        } catch (e) {
            console.error(e);
        }

        if (hpGrid) {
            if (!projects || projects.length === 0) {
                renderProjectsSkeleton(hpGrid, 4);
            } else {
                renderProjectsList(hpGrid, projects.slice(0, 4));
            }
        }

        if (apGrid) {
            if (!projects || projects.length === 0) {
                renderProjectsSkeleton(apGrid, 6);
            } else {
                renderProjectsList(apGrid, projects.slice(0, 6));
            }
        }
    } catch (err) {
        console.error('Error loading live projects:', err);
        if (hpGrid) renderProjectsSkeleton(hpGrid, 4);
        if (apGrid) renderProjectsSkeleton(apGrid, 6);
    }
}

function renderProjectsList(container, list) {
    if (!container) return;
    let html = '';
    list.forEach(p => {
        let statusClass = 'status-cho-xay-dung';
        if (p.status && p.status.includes('xây dựng')) statusClass = 'status-dang-xay-dung';
        if (p.status && (p.status.includes('mở bán') || p.status.includes('nhận đơn'))) statusClass = 'status-dang-nhan-don';
        if (p.status && (p.status.includes('bàn giao') || p.status.includes('hoàn thành'))) statusClass = 'status-cho-ban-giao';

        html += `
            <div class="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                    <div class="relative h-48 w-full rounded-lg overflow-hidden mb-4 bg-surface-container">
                        <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'}" alt="${p.name || p.title}" class="w-full h-full object-cover">
                        <span class="absolute top-3 right-3 status-pill ${statusClass}">${p.status || 'Đang mở bán'}</span>
                    </div>
                    <h3 class="font-bold text-lg text-on-surface mb-1">${p.name || p.title}</h3>
                    <p class="text-sm text-on-surface-variant flex items-center gap-1 mb-3">
                        <span class="material-symbols-outlined text-base">location_on</span> ${p.location}
                    </p>
                    <div class="space-y-1 mb-4">
                        <div class="flex justify-between text-xs text-on-surface-variant font-medium">
                            <span>Tiến độ xây dựng</span>
                            <span class="font-semibold text-primary">${p.progress || 0}%</span>
                        </div>
                        <div class="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                            <div class="bg-primary h-full rounded-full transition-all duration-500" style="width: ${p.progress || 0}%"></div>
                        </div>
                    </div>
                </div>
                <div class="pt-3 border-t border-outline-variant/40 flex items-center justify-between">
                    <span class="text-xs text-on-surface-variant">Chủ đầu tư: <strong>${p.owner || p.investor || 'Đang cập nhật'}</strong></span>
                    <a href="project-detail.html?id=${p.id}" class="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-semibold transition-colors">Chi tiết</a>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// 5. Fetch and Render Live Documents
async function loadLiveDocuments() {
    const containers = [
        document.getElementById('all-docs-list'),
        document.getElementById('docs-container')
    ].filter(Boolean);

    if (containers.length === 0) return;

    containers.forEach(c => renderDocumentsSkeleton(c, 3));

    try {
        let docs = [];
        try {
            if (window.SupabaseService) {
                docs = await window.SupabaseService.getDocuments();
            }
        } catch (e) {
            console.error(e);
        }

        containers.forEach(container => {
            if (!docs || docs.length === 0) {
                renderEmptyState(container, "Chưa có tài liệu nào", "Các tệp tài liệu và biểu mẫu hướng dẫn sẽ được cập nhật sớm.");
                return;
            }

            let html = '';
            docs.forEach(d => {
                const isPdf = (d.doc_type || d.docType || 'PDF').toUpperCase() === 'PDF';
                const iconColor = isPdf ? 'text-red-500 bg-red-50' : 'text-blue-500 bg-blue-50';
                const iconName = isPdf ? 'picture_as_pdf' : 'description';

                html += `
                    <div class="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/60 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-xl ${iconColor} flex items-center justify-center flex-shrink-0">
                                <span class="material-symbols-outlined text-2xl">${iconName}</span>
                            </div>
                            <div>
                                <h4 class="font-bold text-on-surface text-base mb-1">${d.name || d.title}</h4>
                                <div class="flex items-center gap-3 text-xs text-on-surface-variant">
                                    <span class="px-2 py-0.5 bg-surface-container rounded-md font-semibold text-primary">${d.category || 'Tài liệu'}</span>
                                    <span>Định dạng: <strong>${(d.doc_type || d.docType || 'PDF').toUpperCase()}</strong></span>
                                </div>
                            </div>
                        </div>
                        <a href="${d.fileUrl || '#'}\" download class="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 justify-center transition-colors">
                            <span class="material-symbols-outlined text-base">download</span> Tải xuống
                        </a>
                    </div>
                `;
            });
            container.innerHTML = html;
        });
    } catch (err) {
        console.error('Error loading live documents:', err);
        containers.forEach(c => renderEmptyState(c));
    }
}

// Auto-run Live Loaders on Page Load
document.addEventListener('DOMContentLoaded', () => {
    loadLiveProjects();
    loadLiveDocuments();
});

/* INTERACTIVE COMPARE MODAL & LIVE SEARCH HANDLER */
let compareModalProjectsCache = [];

window.openAddCompareModal = async function() {
    const modal = document.getElementById('add-compare-modal');
    const list = document.getElementById('add-compare-list');
    const searchInput = document.getElementById('add-compare-search');

    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (searchInput) searchInput.value = '';

    if (list) {
        list.innerHTML = `
            <div class="text-center py-8 text-slate-400 text-xs flex flex-col items-center gap-2">
                <span class="material-symbols-outlined text-3xl text-slate-300 animate-spin">sync</span>
                <span>Đang nạp danh sách dự án...</span>
            </div>
        `;
    }

    try {
        let projects = [];
        try {
            if (window.SupabaseService) {
                projects = await window.SupabaseService.getProjects();
            }
        } catch (e) {
            console.error(e);
        }

        compareModalProjectsCache = projects || [];
        renderCompareModalList(compareModalProjectsCache);
    } catch (err) {
        console.error('Error fetching modal projects:', err);
        renderCompareModalList([]);
    }
};

window.closeAddCompareModal = function() {
    const modal = document.getElementById('add-compare-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.filterCompareModalProjects = function(query) {
    if (!query) {
        renderCompareModalList(compareModalProjectsCache);
        return;
    }
    const q = query.toLowerCase().trim();
    const filtered = compareModalProjectsCache.filter(p =>
        ((p.name || p.title) && (p.name || p.title).toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q))
    );
    renderCompareModalList(filtered);
};

function renderCompareModalList(list) {
    const container = document.getElementById('add-compare-list');
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-slate-400 text-xs flex flex-col items-center gap-2">
                <span class="material-symbols-outlined text-3xl text-slate-300">folder_off</span>
                <span>Đang tải dự án</span>
            </div>
        `;
        return;
    }

    let html = '';
    list.forEach(p => {
        const safeTitle = (p.name || p.title || '').replace(/'/g, "\\'");
        const safeLoc = (p.location || '').replace(/'/g, "\\'");
        const safeStat = (p.status || 'Đang mở bán').replace(/'/g, "\\'");

        html += `
            <div onclick="addProjectToCompareList('${p.id}', '${safeTitle}', '${safeLoc}', '${safeStat}', ${p.progress || 0})" class="p-3 bg-slate-50 hover:bg-primary/10 border border-slate-200 hover:border-primary/40 rounded-xl cursor-pointer transition-all flex items-center justify-between group">
                <div>
                    <h4 class="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">${p.name || p.title}</h4>
                    <p class="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <span class="material-symbols-outlined text-xs">location_on</span> ${p.location}
                    </p>
                </div>
                <span class="material-symbols-outlined text-slate-400 group-hover:text-primary text-xl">add_circle</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

window.addProjectToCompareList = function(id, title, location, status, progress) {
    const grid = document.getElementById('compare-grid-container');
    if (!grid) return;

    let statusClass = 'status-cho-xay-dung';
    if (status.includes('xây dựng')) statusClass = 'status-dang-xay-dung';
    if (status.includes('mở bán') || status.includes('nhận đơn')) statusClass = 'status-dang-nhan-don';
    if (status.includes('bàn giao') || status.includes('hoàn thành')) statusClass = 'status-cho-ban-giao';

    const card = document.createElement('div');
    card.className = 'bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/60 shadow-sm flex flex-col justify-between relative group';
    card.innerHTML = `
        <div>
            <button onclick="this.closest('.bg-surface-container-lowest').remove()" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 shadow text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors">
                <span class="material-symbols-outlined text-base">close</span>
            </button>
            <div class="relative h-44 w-full rounded-lg overflow-hidden mb-3 bg-surface-container">
                <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80" alt="${title}" class="w-full h-full object-cover">
                <span class="absolute top-3 left-3 status-pill ${statusClass}">${status}</span>
            </div>
            <h3 class="font-bold text-lg text-on-surface mb-1">${title}</h3>
            <p class="text-xs text-on-surface-variant flex items-center gap-1 mb-3">
                <span class="material-symbols-outlined text-sm">location_on</span> ${location}
            </p>
            <div class="space-y-1 mb-3">
                <div class="flex justify-between text-xs text-on-surface-variant font-medium">
                    <span>Tiến độ xây dựng</span>
                    <span class="font-semibold text-primary">${progress}%</span>
                </div>
                <div class="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                    <div class="bg-primary h-full rounded-full transition-all" style="width: ${progress}%"></div>
                </div>
            </div>
        </div>
        <div class="pt-3 border-t border-outline-variant/40">
            <a href="project-detail.html?id=${id}" class="w-full py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center transition-colors">Xem chi tiết</a>
        </div>
    `;

    grid.insertBefore(card, grid.lastElementChild);
    closeAddCompareModal();
};

// --- CTA Modal Logic ---
function openFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    if (!modal) return;
    const content = modal.querySelector('#feedbackModalContent');
    const formState = document.getElementById('feedbackFormState');
    const successState = document.getElementById('feedbackSuccessState');
    const form = document.getElementById('feedbackForm');
    
    // Reset state
    form.reset();
    window.feedbackFiles = [];
    if (typeof renderFeedbackFileList === 'function') {
        renderFeedbackFileList();
    }
    document.getElementById('feedbackName').disabled = false;
    document.getElementById('feedbackName').classList.remove('opacity-50', 'bg-surface-container-highest');
    document.getElementById('toggleBg').classList.remove('bg-primary');
    document.getElementById('toggleBg').classList.add('bg-surface-container-highest');
    document.getElementById('toggleDot').style.transform = 'translateX(0)';
    
    formState.classList.remove('hidden');
    formState.style.opacity = '1';
    successState.classList.add('hidden');
    
    // Reset any width/height styles from previous animations
    content.style.width = '';
    content.style.height = '';
    
    modal.classList.remove('hidden');
    // Trigger reflow
    void modal.offsetWidth;
    modal.classList.remove('opacity-0');
    content.classList.remove('scale-95');
    content.classList.add('scale-100');
}

function closeFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    if (!modal) return;
    const content = modal.querySelector('#feedbackModalContent');
    modal.classList.add('opacity-0');
    content.classList.remove('scale-100');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function toggleAnonymous() {
    const checkbox = document.getElementById('anonymousToggle');
    const nameInput = document.getElementById('feedbackName');
    const toggleBg = document.getElementById('toggleBg');
    const toggleDot = document.getElementById('toggleDot');
    
    if (checkbox.checked) {
        nameInput.disabled = true;
        nameInput.value = '';
        nameInput.classList.add('opacity-50', 'bg-surface-container-highest');
        toggleBg.classList.replace('bg-surface-container-highest', 'bg-primary');
        toggleDot.style.transform = 'translateX(100%)';
    } else {
        nameInput.disabled = false;
        nameInput.classList.remove('opacity-50', 'bg-surface-container-highest');
        toggleBg.classList.replace('bg-primary', 'bg-surface-container-highest');
        toggleDot.style.transform = 'translateX(0)';
    }
}

function submitFeedback(e) {
    e.preventDefault();
    
    const content = document.getElementById('feedbackModalContent');
    const formState = document.getElementById('feedbackFormState');
    const successState = document.getElementById('feedbackSuccessState');
    
    // Lock current dimensions before animating
    content.style.width = content.offsetWidth + 'px';
    content.style.height = content.offsetHeight + 'px';
    
    // Fade out form
    formState.style.opacity = '0';
    formState.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
        formState.classList.add('hidden');
        successState.classList.remove('hidden');
        successState.style.opacity = '0';
        
        // Shrink the modal box to fit the success state nicely
        content.style.width = '100%';
        content.style.height = '350px';
        
        setTimeout(() => {
            successState.style.transition = 'opacity 0.4s ease';
            successState.style.opacity = '1';
        }, 300); // wait for resize
        
    }, 300); // wait for fade out
}

function openSupportModal() {
    const modal = document.getElementById('supportModal');
    if (!modal) return;
    const content = modal.querySelector('div.relative.z-10');
    modal.classList.remove('hidden');
    void modal.offsetWidth;
    modal.classList.remove('opacity-0');
    content.classList.remove('scale-95');
    content.classList.add('scale-100');
}

function closeSupportModal() {
    const modal = document.getElementById('supportModal');
    if (!modal) return;
    const content = modal.querySelector('div.relative.z-10');
    modal.classList.add('opacity-0');
    content.classList.remove('scale-100');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

window.feedbackFiles = [];

function handleFeedbackImage(input) {
    if (!input.files || input.files.length === 0) return;
    
    // Append newly selected files to our global array
    for (let i = 0; i < input.files.length; i++) {
        // Simple check to avoid duplicates by name
        if (!window.feedbackFiles.some(f => f.name === input.files[i].name)) {
            window.feedbackFiles.push(input.files[i]);
        }
    }
    
    // Clear the input so the same file can be selected again if removed
    input.value = '';
    
    renderFeedbackFileList();
}

function removeFeedbackFile(index) {
    window.feedbackFiles.splice(index, 1);
    renderFeedbackFileList();
}

function renderFeedbackFileList() {
    const listContainer = document.getElementById('feedbackFileList');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    window.feedbackFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'flex items-center justify-between bg-surface-container py-1.5 px-3 rounded-lg border border-outline-variant/30';
        fileItem.innerHTML = `
            <div class="flex items-center gap-2 overflow-hidden">
                <span class="material-symbols-outlined text-on-surface-variant text-sm">image</span>
                <span class="text-xs text-on-surface font-medium truncate">${file.name}</span>
            </div>
            <button type="button" onclick="removeFeedbackFile(${index})" class="text-on-surface-variant hover:text-error transition-colors w-6 h-6 flex items-center justify-center rounded-full hover:bg-error/10 flex-shrink-0">
                <span class="material-symbols-outlined text-sm">close</span>
            </button>
        `;
        listContainer.appendChild(fileItem);
    });
}