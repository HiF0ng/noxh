// --- Custom Local Analytics Tracker ---
(function() {
    // 1. Unique Visitors (User chưa đăng ký)
    if (!localStorage.getItem('noxh_uuid')) {
        localStorage.setItem('noxh_uuid', Math.random().toString(36).substring(2) + Date.now().toString(36));
        let unreg = parseInt(localStorage.getItem('noxh_unregistered_users') || '0');
        localStorage.setItem('noxh_unregistered_users', unreg + 1);
    }
    
    // 2. Session & Visit Tracking (Prevent F5 spam)
    // A session is maintained as long as the tab is open (sessionStorage). 
    // We only increment "Total Visits" when a NEW session starts.
    if (!sessionStorage.getItem('noxh_current_session')) {
        sessionStorage.setItem('noxh_current_session', Date.now().toString());
        
        let visits = parseInt(localStorage.getItem('noxh_total_visits') || '0');
        localStorage.setItem('noxh_total_visits', visits + 1);
        
        let sessionCount = parseInt(localStorage.getItem('noxh_session_count') || '0');
        localStorage.setItem('noxh_session_count', sessionCount + 1);
    }

    // 3. Duration & Bounce Tracking
    const pageLoadTime = Date.now();
    let hasInteracted = false;
    
    const interactHandler = () => { hasInteracted = true; };
    window.addEventListener('click', interactHandler, {once:true});
    window.addEventListener('scroll', interactHandler, {once:true});
    window.addEventListener('keypress', interactHandler, {once:true});

    window.addEventListener('beforeunload', () => {
        const timeSpentOnPage = Math.floor((Date.now() - pageLoadTime) / 1000); // seconds
        
        // Add to total duration
        let totalDuration = parseInt(localStorage.getItem('noxh_total_duration') || '0');
        localStorage.setItem('noxh_total_duration', totalDuration + timeSpentOnPage);
        
        // Bounce check: If they didn't interact AND spent less than 10 seconds
        if (!hasInteracted && timeSpentOnPage < 10) {
            let bounces = parseInt(localStorage.getItem('noxh_bounce_count') || '0');
            localStorage.setItem('noxh_bounce_count', bounces + 1);
        }
    });
})();
// -------------------------------------

// Used by the document sections that are rendered from Supabase data.
// Keep this helper global to this script: project/FAQ renderers have their
// own local copy, while the document loaders run independently.
function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', async () => {
    // Load components
    await loadNavbar();
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

async function loadNavbar() {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;
    try {
        const response = await fetch('components/navbar.html');
        if (response.ok) {
            const html = await response.text();
            placeholder.innerHTML = html;
            
            // Initialize dropdown logic
            const btnFunctions = document.getElementById('btn-functions');
            const dropdownFunctions = document.getElementById('dropdown-functions');
            if (btnFunctions && dropdownFunctions) {
                // Remove old listeners to avoid duplicates if loadNavbar is somehow called twice
                const newBtn = btnFunctions.cloneNode(true);
                btnFunctions.parentNode.replaceChild(newBtn, btnFunctions);

                const closeFunctionsDropdown = (restoreActiveItem = true) => {
                    if (!newBtn.classList.contains('dropdown-open') &&
                        !dropdownFunctions.classList.contains('show-dropdown')) return;

                    dropdownFunctions.classList.remove('show-dropdown', 'opacity-100', 'visible');
                    dropdownFunctions.classList.add('opacity-0', 'invisible');
                    newBtn.classList.remove('dropdown-open');

                    if (restoreActiveItem && window.realActiveItem && window.slideNavIndicator) {
                        window.slideNavIndicator(window.realActiveItem, 'is-active');
                    }
                };

                const functionPages = {
                    'faq.html': 'Câu hỏi thường gặp',
                    'compare.html': 'So sánh',
                    'loan.html': 'Tính khoản vay'
                };

                const activateFunctionImmediately = (link) => {
                    const page = (link.getAttribute('href') || '').split('/').pop();
                    const label = functionPages[page];
                    if (!label) return;

                    const iconEl = newBtn.querySelector('.nav-icon');
                    const textEl = newBtn.querySelector('.nav-text');
                    newBtn.classList.add('no-transitions', 'no-icon');
                    if (iconEl) iconEl.style.display = 'none';
                    if (textEl) textEl.textContent = label;
                    void newBtn.offsetHeight;
                    newBtn.classList.remove('no-transitions');

                    window.realActiveItem = newBtn;
                    if (window.slideNavIndicator) {
                        window.slideNavIndicator(newBtn, 'is-active', false);
                    }
                };
                
                newBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = newBtn.classList.contains('dropdown-open');

                    if (isOpen) {
                        closeFunctionsDropdown();
                        return;
                    }
                    
                    // Close other menus if any
                    document.querySelectorAll('.dropdown-open').forEach(el => el.classList.remove('dropdown-open'));
                    document.querySelectorAll('#dropdown-functions.show-dropdown').forEach(el => {
                        el.classList.remove('show-dropdown', 'opacity-100', 'visible');
                        el.classList.add('opacity-0', 'invisible');
                    });
                    
                    // Also close user dropdowns
                    document.querySelectorAll('.user-dropdown-menu').forEach(d => {
                        d.classList.remove('show-dropdown');
                        d.classList.add('hidden');
                        d.classList.remove('flex');
                    });

                    newBtn.classList.add('dropdown-open');
                    dropdownFunctions.classList.add('show-dropdown');
                    dropdownFunctions.classList.remove('opacity-0', 'invisible');
                    dropdownFunctions.classList.add('opacity-100', 'visible');
                    
                    if (window.slideNavIndicator) window.slideNavIndicator(newBtn, 'dropdown-open');
                });

                // A selected function always closes the menu before SPA navigation begins.
                dropdownFunctions.addEventListener('click', (e) => {
                    const link = e.target.closest('a');
                    if (!link) return;

                    // Keep the indicator at its destination instead of animating back
                    // to the previous navbar item before SPA navigation completes.
                    closeFunctionsDropdown(false);
                    activateFunctionImmediately(link);
                });

                // Switching to another mobile/tablet navigation item also closes it.
                newBtn.closest('.top-navbar').querySelectorAll('a.nav-link').forEach(link => {
                    link.addEventListener('click', closeFunctionsDropdown);
                });

                document.addEventListener('click', (e) => {
                    if (newBtn.classList.contains('dropdown-open') &&
                        !newBtn.contains(e.target) && !dropdownFunctions.contains(e.target)) {
                        closeFunctionsDropdown();
                    }
                });
            }
        }
    } catch (err) {
        console.error('Failed to load navbar component', err);
    }
}

async function loadFooter() {
    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) return;
    try {
        const response = await fetch('components/footer.html');
        if (response.ok) {
            const html = await response.text();
            placeholder.innerHTML = html;
            // Double rAF: first frame schedules layout, second frame layout is ready
            requestAnimationFrame(() => requestAnimationFrame(() => fitFooterDesc()));
        }
    } catch (err) {
        console.error('Failed to load footer component', err);
    }
}

function fitFooterDesc() {
    const p = document.getElementById('footer-desc');
    if (!p) return;

    const logo = p.closest('.footer-logo-col')?.querySelector('img');

    const doFit = () => {
        // Reset inline styles
        p.style.fontSize = '';
        p.style.width = '';

        // Mobile/tablet uses a deliberately balanced two-line description.
        // Do not shrink it back to the logo width.
        if (window.matchMedia('(max-width: 1023px)').matches) return;

        // Pin paragraph width to logo's rendered clientWidth
        if (logo && logo.clientWidth > 0) {
            p.style.width = logo.clientWidth + 'px';
        }

        const style = window.getComputedStyle(p);
        let lh = parseFloat(style.lineHeight);
        if (isNaN(lh) || lh === 0) lh = parseFloat(style.fontSize) * 1.5;
        const maxH = lh * 2;
        let fs = parseFloat(style.fontSize);

        // Shrink 0.5px at a time until text fits in 2 lines
        while (p.scrollHeight > Math.ceil(maxH) + 2 && fs > 9) {
            fs -= 0.5;
            p.style.fontSize = fs + 'px';
        }
    };

    if (logo && !logo.complete) {
        logo.addEventListener('load', () => requestAnimationFrame(doFit), { once: true });
    } else {
        requestAnimationFrame(doFit);
    }
}
window.addEventListener('resize', fitFooterDesc);


function initPageScripts() {
    highlightActiveLink();
    adjustFeatureSubtext();
    setupLocationDropdowns();
    setupSaveProjectToggle();
    setupAccordions();
    setupFAQTabs();
    setupFAQSearch();
    loadFaqsFromSupabase();
    loadLegalDocuments();
    loadDocumentSections();
    setupPasswordToggles();
    setupAuthForms();
    initSettingsForm();
    initLoanCalculator();
    setupProjectFilterSort();
    // Required when returning to the Projects page through the SPA router.
    loadLiveProjects();
    loadProjectDetails();
    setupFloorplanZoom(document.querySelector('[data-floorplan-zoom]'));
    loadSavedProjects();
    loadFollowedProjects();
    restoreCompareProjects();
    setupScrollDownBtn();
}

async function initSettingsForm() {
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        // Clone to avoid multiple listeners
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        
        const isLoggedIn = !!(window.SupabaseService && window.SupabaseService.getAuthSession());
        const currentUserStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        let sessionUser = null;
        
        if (currentUserStr) {
            try {
                const parsed = JSON.parse(currentUserStr);
                sessionUser = parsed.user || parsed;
            } catch (e) {}
        }
        
        const fullNameInput = document.getElementById('fullname');
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');
        
        let dbUser = null;
        if (isLoggedIn && window.SupabaseService) {
            dbUser = await window.SupabaseService.getCurrentProfile();
        }
        
        // Populate inputs with fresh database user or session user as fallback
        const activeUser = dbUser || sessionUser;
        if (activeUser) {
            if (fullNameInput) fullNameInput.value = activeUser.full_name || activeUser.fullName || '';
            if (emailInput) emailInput.value = activeUser.email || '';
            if (phoneInput) phoneInput.value = activeUser.phone || '';
        }
        
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                window.hasUnsavedChanges = true;
            });
            input.addEventListener('change', () => {
                window.hasUnsavedChanges = true;
            });
        });

        newSaveBtn.addEventListener('click', async () => {
            window.hasUnsavedChanges = false;
            
            const updatedName = fullNameInput ? fullNameInput.value.trim() : '';
            const updatedEmail = emailInput ? emailInput.value.trim() : '';
            const updatedPhone = phoneInput ? phoneInput.value.trim() : '';
            
            if (isLoggedIn && activeUser && window.SupabaseService) {
                const userId = activeUser.id;
                if (userId) {
                    const updated = await window.SupabaseService.updateOwnProfile({
                        name: updatedName, email: updatedEmail, phone: updatedPhone
                    });
                    if (updated) {
                        // Store the updated user back to localStorage/sessionStorage
                        const storageKey = localStorage.getItem('currentUser') ? 'localStorage' : 'sessionStorage';
                        if (storageKey === 'localStorage') {
                            localStorage.setItem('currentUser', JSON.stringify(updated));
                        } else {
                            sessionStorage.setItem('currentUser', JSON.stringify(updated));
                        }
                        
                        // Update dropdown dynamically
                        setupUserDropdown();
                        showToast('Các thay đổi đã được lưu', 'success');
                    } else {
                        showToast('Lỗi cập nhật thông tin', 'error');
                    }
                } else {
                    showToast('Không tìm thấy ID người dùng', 'error');
                }
            } else {
                showToast('Không thể kết nối cơ sở dữ liệu', 'error');
            }
        });

        const passwordTrigger = document.getElementById('change-pwd-trigger-btn');
        const passwordForm = document.getElementById('change-pwd-form');
        const passwordSave = document.getElementById('save-new-pwd-btn');
        if (passwordTrigger && passwordForm) passwordTrigger.onclick = () => passwordForm.classList.toggle('hidden');
        if (passwordSave) passwordSave.onclick = async () => {
            const oldPassword = document.getElementById('old-password')?.value || '';
            const newPassword = document.getElementById('new-password')?.value || '';
            const confirmPassword = document.getElementById('confirm-new-password')?.value || '';
            const profile = await window.SupabaseService.getCurrentProfile();
            if (!oldPassword || !newPassword || newPassword !== confirmPassword) {
                showToast('Vui lòng nhập đúng mật khẩu cũ và xác nhận mật khẩu mới.', 'error'); return;
            }
            const verification = await window.SupabaseService.signInWithPassword(profile?.email || '', oldPassword);
            if (!verification.success) { showToast('Mật khẩu cũ không chính xác.', 'error'); return; }
            if (await window.SupabaseService.updateAuthPassword(newPassword)) {
                passwordForm.classList.add('hidden'); showToast('Đã cập nhật mật khẩu mới.', 'success');
            } else showToast('Không thể cập nhật mật khẩu. Vui lòng thử lại.', 'error');
        };
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
                const user = window.SupabaseService && await window.SupabaseService.loginUser(emailOrPhone, password);
                if (user && user.success) {
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('currentUser', JSON.stringify(user.user));
                    showToast('Đăng nhập thành công!', 'success');
                    setTimeout(() => { window.location.href = 'homepage.html'; }, 800);
                    return;
                }
                showToast((user && user.error) || 'Đăng nhập thất bại. Vui lòng kiểm tra lại!', 'error');
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
                const registered = window.SupabaseService && await window.SupabaseService.signUpWithPassword({ email, password, fullName: fullname, phone });
                if (registered && registered.success) {
                    if (registered.needsEmailConfirmation) {
                        showToast('Tài khoản đã tạo. Hãy xác nhận email trước khi đăng nhập.', 'success');
                        return;
                    }
                    showToast('Tạo tài khoản thành công!', 'success');
                    setTimeout(() => { window.location.href = 'homepage.html'; }, 800);
                } else {
                    showToast((registered && registered.error) || 'Đăng ký thất bại. Vui lòng thử lại!', 'error');
                }
            } catch (err) {
                showToast('Đăng ký thất bại. Vui lòng thử lại!', 'error');
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
    const customDropdownBtn = document.getElementById('custom-faq-dropdown-btn');
    const customDropdownMenu = document.getElementById('custom-faq-dropdown-menu');
    const customDropdownText = document.getElementById('custom-faq-dropdown-text');
    
    if (customDropdownBtn && customDropdownMenu) {
        customDropdownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            customDropdownMenu.classList.toggle('hidden');
            customDropdownMenu.classList.toggle('flex');
        });
        
        document.addEventListener('click', (e) => {
            if (!customDropdownBtn.contains(e.target) && !customDropdownMenu.contains(e.target)) {
                customDropdownMenu.classList.add('hidden');
                customDropdownMenu.classList.remove('flex');
            }
        });
        
        const dropdownItems = customDropdownMenu.querySelectorAll('.faq-dropdown-item');
        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                customDropdownText.textContent = item.textContent.trim();
                customDropdownMenu.classList.add('hidden');
                customDropdownMenu.classList.remove('flex');
                const targetId = item.getAttribute('data-target');
                const targetBtn = Array.from(document.querySelectorAll('.faq-tab-btn')).find(b => b.getAttribute('data-target') === targetId);
                if (targetBtn) targetBtn.click();
            });
        });
    }

    
    tabBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = newBtn.getAttribute('data-target');
            
            // Deactivate all
            document.querySelectorAll('.faq-tab-btn').forEach(b => {
                b.className = "faq-tab-btn font-label-md text-label-md px-2 md:px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-low flex items-center justify-between transition-colors";
                const icon = b.querySelector('.material-symbols-outlined');
                if (icon) icon.classList.add('hidden');
            });
            
            // Activate clicked
            newBtn.className = "faq-tab-btn font-label-md text-label-md px-2 md:px-4 py-3 rounded-lg bg-primary text-white hover:bg-primary/80 flex items-center justify-between transition-colors active-tab";
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
            
            if (currentHasSidebar !== newHasSidebar) {
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
    
    let minFontSize = Infinity;
    
    elements.forEach(el => {
        const parent = el.parentElement;
        if (!parent) return;
        
        const computedPaddingLeft = parseFloat(window.getComputedStyle(parent).paddingLeft) || 0;
        const computedPaddingRight = parseFloat(window.getComputedStyle(parent).paddingRight) || 0;
        const parentWidth = parent.clientWidth - (computedPaddingLeft + computedPaddingRight);
        const textWidth = el.scrollWidth;
        
        const computedFontSize = parseFloat(window.getComputedStyle(el).fontSize) || 16;
        
        if (textWidth > parentWidth && parentWidth > 0) {
            const ratio = parentWidth / textWidth;
            const targetSize = computedFontSize * ratio;
            if (targetSize < minFontSize) {
                minFontSize = targetSize;
            }
        } else if (computedFontSize < minFontSize) {
            minFontSize = computedFontSize; // Keep track of the minimum natural size
        }
    });
    
    // Don't shrink below a readable size
    if (minFontSize !== Infinity) {
        if (minFontSize < 6) minFontSize = 6;
        
        // Apply the same minimum size to all 4 cards
        elements.forEach(el => {
            el.style.fontSize = `${minFontSize}px`;
        });
    }
}


function setupUserDropdown() {
    const elements = [];

    const resetFunctionButtonForUserMenu = () => {
        const button = document.getElementById('btn-functions');
        if (!button) return;

        button.classList.remove('is-active', 'dropdown-open', 'no-icon');
        const iconEl = button.querySelector('.nav-icon');
        const textEl = button.querySelector('.nav-text');
        if (iconEl) {
            iconEl.style.display = '';
            iconEl.textContent = 'widgets';
        }
        if (textEl) textEl.textContent = 'Chức năng';
    };

    const restoreMobileNavigationSelection = () => {
        if (typeof highlightActiveLink === 'function') {
            highlightActiveLink();
        }
    };
    
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
        
        // Remove existing dropdown if any (useful for re-initialization)
        const existingDropdown = menuContainer.querySelector('.user-dropdown-menu');
        if (existingDropdown) {
            existingDropdown.remove();
        }
        
        menuContainer.style.position = 'relative';
        avatarWrapper.classList.add('cursor-pointer');
        
        // Create dropdown menu
        const dropdown = document.createElement('div');
        dropdown.className = 'absolute right-0 top-full mt-6 w-64 bg-surface-container-lowest rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-outline-variant pt-2 pb-1 hidden flex-col z-50 user-dropdown-menu';
        
        // Support both persistent and per-tab login sessions.
        const authSession = window.SupabaseService && window.SupabaseService.getAuthSession();
        const isLoggedIn = Boolean(authSession && authSession.access_token);
        let currentUser = null;
        let currentUserStorage = null;
        try {
            const localUser = localStorage.getItem('currentUser');
            const sessionUser = sessionStorage.getItem('currentUser');
            const userStr = localUser || sessionUser;
            currentUserStorage = localUser ? localStorage : (sessionUser ? sessionStorage : null);
            if (userStr) {
                const parsedUser = JSON.parse(userStr);
                currentUser = parsedUser.user || parsedUser;
            }
        } catch (e) {}

        const getUserName = (user) => user && (
            user.full_name || user.fullName || user.name || user.display_name ||
            (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name))
        );
        const getUserContact = (user) => user && (
            user.email || user.phone || (user.user_metadata && user.user_metadata.email)
        );
        
        // --- Add Profile Banner if logged in ---
        if (isLoggedIn && currentUser) {
            const banner = document.createElement('div');
            banner.className = 'px-4 py-3 mb-1 border-b border-outline-variant/50 flex flex-col gap-0.5 bg-surface-container-lowest';
            
            const nameEl = document.createElement('div');
            nameEl.className = 'user-dropdown-name font-bold text-[15px] text-on-surface truncate';
            nameEl.textContent = getUserName(currentUser) || 'Người dùng';
            
            const contactEl = document.createElement('div');
            contactEl.className = 'user-dropdown-contact font-label-md text-[13px] text-on-surface-variant truncate';
            contactEl.textContent = getUserContact(currentUser) || 'Thành viên';
            
            // Sync with Supabase
            if (window.SupabaseService) {
                const identifier = currentUser.email || currentUser.phone || currentUser.id;
                if (identifier) {
                    window.SupabaseService.getUser(identifier).then(dbUser => {
                        if (dbUser) {
                            currentUser = dbUser;
                            nameEl.textContent = getUserName(dbUser) || 'Người dùng';
                            contactEl.textContent = getUserContact(dbUser) || 'Thành viên';
                            (currentUserStorage || localStorage).setItem('currentUser', JSON.stringify(dbUser));
                        }
                    }).catch(err => console.error("Error syncing user data from Supabase:", err));
                }
            }
            
            banner.appendChild(nameEl);
            banner.appendChild(contactEl);
            dropdown.appendChild(banner);
        }
        
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
                { label: 'Cài đặt', url: 'settings.html', icon: 'settings' }
            ];
            
            if (currentUser && currentUser.role === 'admin') {
                links.push({ label: 'Quản trị Admin', url: '#', icon: 'admin_panel_settings', admin: true });
            }
            
            links.push({ label: 'Đăng xuất', url: '#', icon: 'logout', danger: true });
        }
        
        links.forEach(link => {
            if (link.danger && links.indexOf(link) === links.length - 1) {
                const hr = document.createElement('hr');
                hr.className = 'border-outline-variant my-1';
                dropdown.appendChild(hr);
            }
            const a = document.createElement('a');
            a.href = link.url;

            // A selected profile-menu action should always dismiss the menu
            // before navigation or logout continues.
            a.addEventListener('click', () => {
                dropdown.classList.remove('show-dropdown');
                dropdown.classList.add('hidden');
                dropdown.classList.remove('flex');
            });
            
            if (link.label === 'Đăng xuất') {
                a.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (window.SupabaseService) await window.SupabaseService.signOut();
                    window.location.reload();
                });
            }
            
            const currentPage = window.location.pathname.split('/').pop() || 'homepage.html';
            const isActive = link.url === currentPage;
            
            let classes = 'user-dropdown-link px-4 py-2.5 min-h-12 flex items-center gap-3 transition-colors ';
            
            if (isActive) {
                classes += 'text-primary font-bold text-[15px] bg-primary/5 hover:bg-primary/10';
            } else if (link.danger) {
                classes += 'text-error hover:bg-error-container hover:text-error font-label-md text-label-md';
            } else if (link.admin) {
                classes += 'text-tertiary hover:bg-tertiary-container hover:text-tertiary font-bold text-label-md';
            } else if (link.highlight) {
                classes += 'text-primary hover:bg-surface-container-low font-bold text-label-md';
            } else {
                classes += 'text-on-surface hover:bg-surface-container font-medium text-label-md';
            }
            a.className = classes;
            
            let html = '';
            if (link.icon) {
                let iconColor = 'text-on-surface-variant';
                if (isActive) iconColor = '';
                else if (link.danger) iconColor = 'text-error';
                else if (link.admin) iconColor = 'text-tertiary';
                html += `<span class="user-dropdown-icon material-symbols-outlined text-[20px] ${iconColor}">${link.icon}</span>`;
            }
            html += `<span class="user-dropdown-label truncate">${link.label}</span>`;
            a.innerHTML = html;
            dropdown.appendChild(a);
        });
        
        menuContainer.appendChild(dropdown);
        
        // Remove old listener if any by cloning
        const newAvatarWrapper = avatarWrapper.cloneNode(true);
        avatarWrapper.parentNode.replaceChild(newAvatarWrapper, avatarWrapper);
        
        // Toggle dropdown
        newAvatarWrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = !dropdown.classList.contains('show-dropdown');
            
            // Hide all other dropdowns (including btn-functions)
            document.querySelectorAll('.user-dropdown-menu').forEach(d => {
                d.classList.remove('show-dropdown');
                d.classList.add('hidden');
                d.classList.remove('flex');
            });
            const btnFunctions = document.getElementById('btn-functions');
            if (btnFunctions) {
                const wasOpen = btnFunctions.classList.contains('dropdown-open');
                btnFunctions.classList.remove('dropdown-open');
                if (wasOpen && window.realActiveItem && window.slideNavIndicator) {
                    window.slideNavIndicator(window.realActiveItem, 'is-active');
                }
            }
            document.querySelectorAll('#dropdown-functions.show-dropdown').forEach(el => {
                el.classList.remove('show-dropdown', 'opacity-100', 'visible');
                el.classList.add('opacity-0', 'invisible');
            });
            
            const indicator = document.getElementById('nav-indicator');
            if (isHidden) {
                dropdown.classList.add('show-dropdown');
                dropdown.classList.remove('hidden');
                dropdown.classList.add('flex');
                
                // Hide the active state while the profile menu is open. Function
                // pages need their regular dark widgets icon, not white text.
                if (indicator) indicator.style.opacity = '0';
                document.querySelectorAll('#nav-links-container .nav-item').forEach(item => {
                    item.classList.remove('is-active', 'dropdown-open');
                });
                resetFunctionButtonForUserMenu();
            } else {
                restoreMobileNavigationSelection();
            }
        });
    });
    
    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.user-dropdown-menu').forEach(d => {
            // Check if clicking inside dropdown
            if (!d.contains(e.target)) {
                if (d.classList.contains('show-dropdown')) {
                    d.classList.remove('show-dropdown');
                    d.classList.add('hidden');
                    d.classList.remove('flex');
                    
                    // Restore active item and indicator
                    restoreMobileNavigationSelection();
                }
            }
        });
    });
}

function highlightActiveLink() {
    let currentPage = window.location.pathname.split('/').pop() || 'homepage.html';
    if (!currentPage || currentPage === '/' || currentPage === 'index.html') currentPage = 'homepage.html';
    // A detail page belongs to the Projects section in the global navigation.
    const activeNavPage = currentPage === 'details.html' ? 'all-projects.html' : currentPage;

    // Top Navbar Links
    const indicator = document.getElementById('nav-indicator');
    const isInitialized = indicator && indicator.style.width && indicator.style.width !== '0px';
    const topNavLinks = document.querySelectorAll('.top-navbar a.nav-link:not(.user-dropdown-menu a)');
    const btnFunctions = document.getElementById('btn-functions');
    let targetLink = null;

    const functionPages = {
        'faq.html': { icon: 'help', text: 'Câu hỏi thường gặp' },
        'compare.html': { icon: 'compare_arrows', text: 'So sánh' },
        'loan.html': { icon: 'calculate', text: 'Tính khoản vay' }
    };

    topNavLinks.forEach(link => {
        let href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('#')) return;
        href = href.split('/').pop();
        if (!href || href === '/' || href === 'index.html') href = 'homepage.html';

        if (href === activeNavPage) {
            targetLink = link;
        }
    });

    if (!targetLink && btnFunctions && functionPages[currentPage]) {
        targetLink = btnFunctions;
    }

    if (targetLink) {
        window.realActiveItem = targetLink;
    }

    // Update btn-functions UI
    if (btnFunctions) {
        const iconEl = btnFunctions.querySelector('.nav-icon');
        const textEl = btnFunctions.querySelector('.nav-text');
        
        // Disable transition temporarily to change text/icon instantly without slide glitch
        btnFunctions.classList.add('no-transitions');
        
        if (functionPages[currentPage]) {
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
        }
        
        // Force reflow and restore
        void btnFunctions.offsetHeight;
        btnFunctions.classList.remove('no-transitions');
    }

    if (targetLink) {
        if (isInitialized && window.slideNavIndicator) {
            // SPA navigation: animate smoothly
            window.slideNavIndicator(targetLink, 'is-active', true);
        } else {
            // Initial page load: snap without animation
            // First apply the class so CSS applies, then snap indicator
            topNavLinks.forEach(link => link.classList.remove('is-active'));
            if (btnFunctions) btnFunctions.classList.remove('is-active');
            
            targetLink.classList.add('is-active');
            setTimeout(() => {
                if (window.slideNavIndicator) window.slideNavIndicator(targetLink, 'is-active', false);
            }, 50);
        }
    } else {
        // Current page is not in the navbar (e.g. login.html, signup.html)
        topNavLinks.forEach(link => link.classList.remove('is-active'));
        if (btnFunctions) btnFunctions.classList.remove('is-active', 'dropdown-open');
        
        if (indicator) {
            indicator.style.opacity = '0';
            indicator.style.width = '0px';
        }
        window.realActiveItem = null;
    }

    // Sidebar Menu Links
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    sidebarLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        
        // Skip feedback/logout links which are at the bottom
        if (link.textContent.includes('Gửi phản hồi') || link.textContent.includes('Đăng xuất')) return;
        
        // Base classes
        const baseClasses = 'flex items-center px-4 py-3 rounded-lg transition-all duration-200 scale-95 active:scale-90 text-[17px] font-bold truncate whitespace-nowrap';
        
        if (href === activeNavPage) {
            link.className = `${baseClasses} bg-primary text-white font-bold shadow-md`;
            
            // Fix icon fill state for active
            const icon = link.querySelector('.material-symbols-outlined');
            if (icon) icon.style.fontVariationSettings = "'FILL' 1, 'wght' 500";
        } else {
            link.className = `${baseClasses} text-on-surface-variant hover:bg-surface-container-high`;
            
            // Fix icon fill state for inactive
            const icon = link.querySelector('.material-symbols-outlined');
            if (icon) icon.style.fontVariationSettings = "'FILL' 0, 'wght' 500";
        }
    });
    
    // Update dropdown menu items dynamically
    const dropdownLinks = document.querySelectorAll('.user-dropdown-menu a');
    dropdownLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        // Skip danger items like Logout
        if (link.textContent.includes('Đăng xuất')) return;
        
        const baseClasses = 'user-dropdown-link px-4 py-2.5 min-h-12 flex items-center gap-3 transition-colors';
        if (href && href === currentPage) {
            link.className = `${baseClasses} text-primary font-bold text-[15px] bg-primary/5 hover:bg-primary/10`;
        } else {
            // Default inactive state
            link.className = `${baseClasses} text-on-surface hover:text-primary hover:bg-surface-container-low font-label-md text-label-md font-medium`;
        }
    });

    // Classic Desktop Navbar Links
    const desktopNavLinks = document.querySelectorAll('.top-navbar-desktop a.nav-link:not(.user-dropdown-menu a)');
    desktopNavLinks.forEach(link => {
        let href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('#')) return;
        href = href.split('/').pop();
        if (!href || href === '/' || href === 'index.html') href = 'homepage.html';

        if (href === activeNavPage) {
            link.className = "nav-link font-label-md text-label-md text-primary border-b-2 border-primary pb-1 font-bold transition-colors active";
        } else {
            link.className = "nav-link font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors";
        }
    });
}

window.slideNavIndicator = function(targetItem, activeClass = 'is-active', animate = true) {
    const container = document.getElementById('nav-links-container');
    const indicator = document.getElementById('nav-indicator');
    if (!container || !indicator || !targetItem) return;

    const currentActive = container.querySelector('.nav-item.is-active') || container.querySelector('.nav-item.dropdown-open');
    
    // Disable transitions to calculate final state instantly
    container.classList.add('no-transitions');
    
    // Swap classes to target state
    if (currentActive) currentActive.classList.remove('is-active', 'dropdown-open');
    targetItem.classList.add(activeClass);
    
    // Force layout flush and measure accurately regardless of nested relative divs
    const targetRect = targetItem.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const finalLeft = targetRect.left - containerRect.left;
    const finalWidth = targetRect.width;
    
    if (animate && currentActive && currentActive !== targetItem) {
        // Revert to current state
        targetItem.classList.remove(activeClass);
        if (currentActive.id === 'btn-functions') currentActive.classList.add('dropdown-open');
        else currentActive.classList.add('is-active');
        
        // Force layout flush for the reverted state
        void container.offsetHeight;
        
        // Re-enable transitions
        container.classList.remove('no-transitions');
        
        // Apply final target classes to start CSS animation on items
        if (currentActive) currentActive.classList.remove('is-active', 'dropdown-open');
        targetItem.classList.add(activeClass);
        
        indicator.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    } else {
        // No animation needed (e.g. page load)
        container.classList.remove('no-transitions');
        indicator.style.transition = 'none';
        // Ensure target is active
        if (currentActive && currentActive !== targetItem) currentActive.classList.remove('is-active', 'dropdown-open');
        targetItem.classList.add(activeClass);
    }

    // Move indicator to final target
    indicator.style.left = `${finalLeft}px`;
    indicator.style.width = `${finalWidth}px`;
    indicator.style.opacity = '1';
};


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
        btn.className = 'px-2 md:px-4 py-2 text-left hover:bg-surface-container hover:text-primary transition-colors text-sm text-on-surface province-item';
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
            btn.className = 'px-2 md:px-4 py-2 text-left hover:bg-surface-container hover:text-primary transition-colors text-sm text-on-surface district-item';
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

async function loadProjectDetails() {
    if (!document.getElementById('detail-title') || !window.SupabaseService) return;
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    const project = await window.SupabaseService.getProject(id);
    if (!project) return;
    const details = project.details || {};
    const setText = (elementId, value, fallback = 'Đang cập nhật') => { const el = document.getElementById(elementId); if (el) el.textContent = value || fallback; };
    const estimatedPrice = (details.estimatedPrice || '').trim().replace(/\s*\/?\s*m(?:2|²)?\s*$/i, '');
    const displayPrice = estimatedPrice ? `Khoảng ${estimatedPrice}/m²` : project.price;
    const setQuickField = (field, value) => document.querySelectorAll(`[data-detail-field="${field}"]`).forEach(el => { el.textContent = value || 'Đang cập nhật'; });
    setText('detail-title', project.name); setText('detail-breadcrumb-title', project.name); setText('detail-location', details.address || project.location); setQuickField('investor', project.investor); setText('detail-price', displayPrice); setText('detail-status', project.status);
    setQuickField('area', details.area); setQuickField('scale', details.scale); setQuickField('handover', details.handover);
    const desc = document.getElementById('detail-desc'); if (desc) desc.textContent = project.desc || 'Đang cập nhật thông tin dự án.';

    const images = [project.imageUrl, ...(details.gallery || [])].filter(Boolean);
    const setDetailImage = (imageId, url) => { const image = document.getElementById(imageId); const skeleton = document.getElementById(imageId + '-skeleton'); if (!image || !url) return; image.onload = () => { image.classList.remove('opacity-0'); if (skeleton) skeleton.classList.add('hidden'); }; image.src = url; };
    setDetailImage('detail-hero-image', images[0]);
    ['detail-gallery-thumb-0', 'detail-gallery-thumb-1'].forEach((thumbId, index) => setDetailImage(thumbId, images[index + 1]));
    setupProjectGallery(images);

    const headings = Array.from(document.querySelectorAll('h2'));
    const floorplanHeading = headings.find(heading => heading.textContent.trim() === 'Mặt bằng căn hộ');
    const floorplanPanel = floorplanHeading && floorplanHeading.nextElementSibling;
    if (floorplanPanel && details.floorplans && details.floorplans.length) {
        const plans = details.floorplans;
        floorplanPanel.innerHTML = `<div class="relative min-h-[360px] md:min-h-[560px] bg-surface-container"><div id="detail-floorplan-skeleton" class="absolute inset-0 skeleton-shimmer"></div><img id="detail-floorplan-image" data-floorplan-zoom class="w-full h-auto max-h-[620px] min-h-[360px] md:min-h-[560px] object-contain bg-white cursor-zoom-in opacity-0 transition-opacity duration-200" src="${plans[0].url}" alt="Mặt bằng căn hộ"></div><p id="detail-floorplan-note" class="mt-3 text-center font-body-md text-body-md text-on-surface-variant">${plans[0].note || ''}</p><div id="detail-floorplan-tabs" class="flex flex-wrap justify-center gap-sm mt-sm"></div>`;
        const image = document.getElementById('detail-floorplan-image'); const note = document.getElementById('detail-floorplan-note'); const tabs = document.getElementById('detail-floorplan-tabs');
        const floorplanSkeleton = document.getElementById('detail-floorplan-skeleton');
        const revealFloorplan = () => { image.classList.remove('opacity-0'); if (floorplanSkeleton) floorplanSkeleton.classList.add('hidden'); };
        image.onload = revealFloorplan;
        if (image.complete && image.naturalWidth) revealFloorplan();
        setupFloorplanZoom(image);
        plans.forEach((plan, index) => { const btn = document.createElement('button'); btn.type = 'button'; btn.className = `px-4 py-2 rounded-full border font-label-md text-label-md ${index === 0 ? 'border-primary text-primary bg-primary-fixed/10' : 'border-outline text-on-surface-variant'}`; btn.textContent = plan.note || `Mặt bằng ${index + 1}`; btn.onclick = () => { image.src = plan.url; note.textContent = plan.note || ''; tabs.querySelectorAll('button').forEach(button => button.className = 'px-4 py-2 rounded-full border border-outline text-on-surface-variant font-label-md text-label-md'); btn.className = 'px-4 py-2 rounded-full border border-primary text-primary bg-primary-fixed/10 font-label-md text-label-md'; }; tabs.appendChild(btn); });
    }

    const mapContainer = document.getElementById('detail-map-container'); const address = details.address || project.location;
    setText('detail-address', address, '');
    if (mapContainer) { const marker = mapContainer.querySelector('.relative.z-10'); if (marker) marker.remove(); const mapImage = mapContainer.querySelector('[data-location]'); if (mapImage && details.locationMapUrl) mapImage.style.backgroundImage = `url("${details.locationMapUrl}")`; if (details.mapsUrl) mapContainer.onclick = () => window.open(details.mapsUrl, '_blank', 'noopener'); }

    const escapeHtml = value => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const progressCard = document.getElementById('detail-progress-card');
    if (progressCard) {
        const milestones = ['Chờ xây dựng', 'Đang xây dựng', 'Sắp nhận hồ sơ', 'Đang nhận đơn', 'Chờ bàn giao'];
        const stored = details.statusTimeline || []; const lastReached = stored.reduce((last, item, index) => item.checked ? index : last, -1);
        progressCard.innerHTML = `<h3 class="font-title-lg text-title-lg font-bold text-on-surface mb-5">Tiến độ Dự án</h3><div class="flex flex-col">${milestones.map((label, index) => { const item = stored[index] || {}; const reached = index <= lastReached; const current = index === lastReached; return `<div class="detail-timeline-item relative flex items-center gap-4 ${index < milestones.length - 1 ? 'pb-7' : ''}">${index < milestones.length - 1 ? `<span class="detail-timeline-connector absolute left-4 -translate-x-1/2 top-8 -bottom-7 w-0.5 ${index < lastReached ? 'bg-primary' : 'border-l-2 border-dashed border-outline-variant'}"></span>` : ''}<span class="detail-timeline-point relative z-10 w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${reached ? 'bg-primary text-white' : 'border-2 border-outline-variant bg-surface-container-lowest text-outline'}">${reached ? '<span class="material-symbols-outlined text-[17px]">check</span>' : '<span class="w-2.5 h-2.5 rounded-full bg-outline-variant"></span>'}</span><div class="detail-timeline-content min-w-0"><p class="detail-timeline-title font-label-md text-label-md ${current ? 'text-primary font-bold' : reached ? 'text-on-surface' : 'text-outline'}">${label}</p>${item.note ? `<p class="detail-timeline-note font-body-md text-sm text-on-surface-variant mt-0.5">${escapeHtml(item.note)}</p>` : ''}</div></div>`; }).join('')}</div>`;
        progressCard.innerHTML += '<button id="detail-follow-btn" type="button" class="mt-5 w-full border border-primary text-primary bg-surface-container-lowest font-label-md text-label-md py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"><span class="material-symbols-outlined text-[20px]">edit_document</span><span>Đăng ký dự án</span></button>';
    }
    const amenitiesList = Array.from(document.querySelectorAll('ul.grid')).find(list => list.previousElementSibling && list.previousElementSibling.textContent.trim() === 'Tiện ích nổi bật');
    if (amenitiesList && Array.isArray(details.amenities)) amenitiesList.innerHTML = details.amenities.map(item => `<li class="flex items-center gap-2 overflow-hidden"><span class="material-symbols-outlined text-secondary icon-fill flex-shrink-0">check_circle</span><span class="font-body-md text-body-md text-on-surface truncate">${escapeHtml(item)}</span></li>`).join('');
    setupProjectSaveButton(id);
    setupProjectFollowButton(id);
}

function setupProjectGallery(images) {
    if (!images.length) return;
    let index = 0; let modal = document.getElementById('project-gallery-modal');
    if (!modal) { modal = document.createElement('div'); modal.id = 'project-gallery-modal'; modal.className = 'fixed inset-0 z-[100] hidden items-center justify-center bg-black/85 p-4'; modal.innerHTML = '<button type="button" data-close class="absolute top-5 right-5 text-white text-4xl">×</button><button type="button" data-prev class="absolute left-4 md:left-10 text-white text-5xl">‹</button><img data-image class="max-h-[88vh] max-w-[88vw] object-contain rounded-lg"><button type="button" data-next class="absolute right-4 md:right-10 text-white text-5xl">›</button>'; document.body.appendChild(modal); }
    const render = () => { modal.querySelector('[data-image]').src = images[index]; }; const open = start => { index = start; render(); modal.classList.remove('hidden'); modal.classList.add('flex'); };
    modal.querySelector('[data-close]').onclick = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); }; modal.querySelector('[data-prev]').onclick = () => { index = (index - 1 + images.length) % images.length; render(); }; modal.querySelector('[data-next]').onclick = () => { index = (index + 1) % images.length; render(); }; modal.onclick = event => { if (event.target === modal) modal.querySelector('[data-close]').click(); };
    const hero = document.getElementById('detail-hero-image'); if (hero) hero.onclick = () => open(0); ['detail-gallery-thumb-0', 'detail-gallery-thumb-1'].forEach((id, i) => { const thumb = document.getElementById(id); if (thumb) thumb.onclick = () => open(Math.min(i + 1, images.length - 1)); }); const viewAll = document.getElementById('detail-view-gallery'); if (viewAll) viewAll.onclick = () => open(0);
}

function setupFloorplanZoom(image) {
    if (!image || image.dataset.zoomBound === 'true') return;
    image.dataset.zoomBound = 'true';
    let modal = document.getElementById('floorplan-zoom-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'floorplan-zoom-modal';
        modal.className = 'fixed inset-0 z-[110] hidden items-center justify-center bg-black/85 p-4';
        modal.innerHTML = '<button type="button" data-close aria-label="Đóng ảnh mặt bằng" class="absolute top-5 right-5 z-10 w-11 h-11 rounded-full bg-white/15 text-white text-3xl leading-none hover:bg-white/30 transition-colors">×</button><img data-image class="max-h-[90vh] max-w-[92vw] object-contain rounded-lg shadow-2xl cursor-zoom-out" alt="Mặt bằng căn hộ">';
        document.body.appendChild(modal);
        const close = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };
        modal.querySelector('[data-close]').onclick = close;
        modal.onclick = event => { if (event.target === modal || event.target === modal.querySelector('[data-image]')) close(); };
        document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.classList.contains('hidden')) close(); });
    }
    image.onclick = () => {
        const modalImage = modal.querySelector('[data-image]');
        modalImage.src = image.currentSrc || image.src;
        modalImage.alt = image.alt || 'Mặt bằng căn hộ';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };
}

async function setupProjectSaveButton(projectId) {
    const button = document.getElementById('detail-save-btn'); if (!button || !window.SupabaseService) return;
    let user = null; try { user = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'null'); user = user && (user.user || user); } catch (_) {}
    if (!user) { button.onclick = () => { window.location.href = 'login.html'; }; return; }
    if (!user.id && user.email) user = await window.SupabaseService.getUser(user.email);
    if (!user || !user.id) return;
    const setState = saved => { button.classList.toggle('bg-primary', saved); button.classList.toggle('text-white', saved); button.classList.toggle('text-primary', !saved); const icon = button.querySelector('.material-symbols-outlined'); const label = button.querySelector('span:not(.material-symbols-outlined)'); if (icon) icon.classList.toggle('icon-fill', saved); if (label) label.textContent = saved ? 'Đã lưu' : 'Lưu Dự án'; };
    let saved = await window.SupabaseService.isProjectSaved(user.id, projectId); setState(saved);
    button.onclick = async () => { button.disabled = true; const next = !saved; if (await window.SupabaseService.setProjectSaved(user.id, projectId, next)) { saved = next; setState(saved); } else alert('Không thể cập nhật dự án đã lưu. Vui lòng thử lại.'); button.disabled = false; };
}

async function setupProjectFollowButton(projectId) {
    const button = document.getElementById('detail-follow-btn'); if (!button || !window.SupabaseService) return;
    let user = null; try { user = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'null'); user = user && (user.user || user); } catch (_) {}
    if (!user) { button.onclick = () => { window.location.href = 'login.html'; }; return; }
    if (!user.id && user.email) user = await window.SupabaseService.getUser(user.email);
    if (!user || !user.id) return;
    const setState = followed => {
        button.classList.toggle('bg-primary', followed);
        button.classList.toggle('text-white', followed);
        button.classList.toggle('text-primary', !followed);
        button.classList.toggle('bg-surface-container-lowest', !followed);
        button.innerHTML = `<span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' ${followed ? 1 : 0}">edit_document</span><span>${followed ? 'Đang đăng ký' : 'Đăng ký dự án'}</span>`;
    };
    let followed = await window.SupabaseService.isProjectFollowed(user.id, projectId); setState(followed);
    button.onclick = async () => { button.disabled = true; const next = !followed; if (await window.SupabaseService.setProjectFollowed(user.id, projectId, next)) { followed = next; setState(followed); } else alert('Không thể cập nhật trạng thái đăng ký. Vui lòng thử lại.'); button.disabled = false; };
}

async function loadFaqsFromSupabase() {
    const lists = document.querySelectorAll('.faq-list');
    if (!lists.length || !window.SupabaseService) return;
    const categoryMap = { 'doi-tuong': 'doi-tuong', 'dieu-kien': 'dieu-kien-ho-so', 'vay-von': 'vay-von', 'quyen-so-huu': 'quyen-so-huu' };
    const escapeHtml = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    try {
        const faqs = await window.SupabaseService.getFaqs();
        lists.forEach(list => { list.innerHTML = ''; });
        faqs.forEach(faq => {
            const targetId = categoryMap[faq.category];
            const list = targetId && document.querySelector(`#${targetId} .faq-list`);
            if (!list) return;
            const item = document.createElement('div');
            item.className = 'bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-outline-variant overflow-hidden';
            item.innerHTML = `<button class="accordion-header w-full px-md py-4 flex justify-between items-center text-left hover:bg-surface-container-low transition-colors"><span class="font-label-md text-label-md text-on-surface">${escapeHtml(faq.question)}</span><span class="material-symbols-outlined text-outline-variant accordion-icon">expand_more</span></button><div class="accordion-content"><div class="accordion-inner px-md pb-4 pt-2 font-body-md text-body-md text-on-surface-variant border-t border-outline-variant whitespace-pre-line">${escapeHtml(faq.answer)}</div></div>`;
            list.appendChild(item);
        });
        setupAccordions();
        setupFAQSearch();
    } catch (error) {
        console.error('Unable to load FAQs from Supabase:', error);
    }
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
        const statusFilters = {
            'status-waiting-construction': 'Chờ xây dựng',
            'status-under-construction': 'Đang xây dựng',
            'status-upcoming-applications': 'Sắp nhận hồ sơ',
            'status-accepting-applications': 'Đang nhận đơn',
            'status-waiting-handover': 'Chờ bàn giao'
        };
        const statusVal = statusFilters[sortVal] || (statusSelect ? statusSelect.value : 'all');
        
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
        if (sortVal === 'latest' || statusFilters[sortVal]) {
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
        if (visText) visText.textContent = visibleCount > 0 ? `1 - ${visibleCount}` : '0';
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
                <div class="skeleton-shimmer aspect-[2/3] w-full rounded-lg mb-2"></div>
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
                projects = (projects || []).filter(project => !(project.details && project.details.isDraft));
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

async function loadSavedProjects() {
    const grid = document.getElementById('saved-projects-grid');
    if (!grid || !window.SupabaseService) return;
    let user = null;
    try { user = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'null'); user = user && (user.user || user); } catch (_) {}
    if (!user) { grid.innerHTML = '<div class="col-span-full py-12 text-center text-on-surface-variant">Vui lòng <a href="login.html" class="text-primary font-semibold hover:underline">đăng nhập</a> để xem các dự án đã lưu.</div>'; return; }
    if (!user.id && user.email) user = await window.SupabaseService.getUser(user.email);
    if (!user || !user.id) { grid.innerHTML = '<div class="col-span-full py-12 text-center text-on-surface-variant">Không xác định được tài khoản người dùng.</div>'; return; }
    grid.innerHTML = '<div class="col-span-full py-12 text-center text-on-surface-variant">Đang tải dự án đã lưu...</div>';
    const projects = await window.SupabaseService.getSavedProjects(user.id);
    if (projects === null) { grid.innerHTML = '<div class="col-span-full py-12 text-center text-error">Không thể tải dự án đã lưu. Vui lòng thử lại.</div>'; return; }
    if (!projects.length) { grid.innerHTML = '<div class="col-span-full py-xl flex flex-col items-center justify-center text-center bg-surface-container-lowest rounded-lg border border-dashed border-outline-variant"><div class="w-24 h-24 bg-surface-container-low rounded-full flex items-center justify-center mb-4 text-primary"><span class="material-symbols-outlined text-4xl">bookmark_border</span></div><h3 class="font-headline-md text-headline-md text-on-surface mb-2">Chưa có Dự án nào được lưu</h3><p class="font-body-md text-body-md text-on-surface-variant mb-6 max-w-md">Hãy khám phá các dự án phù hợp với nhu cầu của bạn.</p><a href="all-projects.html" class="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded-full">Khám phá Dự án</a></div>'; return; }
    renderProjectsList(grid, projects);
}

async function loadFollowedProjects() {
    const grid = document.getElementById('working-projects-grid');
    if (!grid || !window.SupabaseService) return;
    let user = null;
    try { user = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'null'); user = user && (user.user || user); } catch (_) {}
    if (!user) { grid.innerHTML = '<div class="py-12 text-center text-on-surface-variant">Vui lòng <a href="login.html" class="text-primary font-semibold hover:underline">đăng nhập</a> để xem các dự án đang đăng ký.</div>'; return; }
    if (!user.id && user.email) user = await window.SupabaseService.getUser(user.email);
    if (!user || !user.id) { grid.innerHTML = '<div class="py-12 text-center text-on-surface-variant">Không xác định được tài khoản người dùng.</div>'; return; }
    grid.innerHTML = '<div class="py-12 text-center text-on-surface-variant">Đang tải dự án đang đăng ký...</div>';
    const projects = await window.SupabaseService.getFollowedProjects(user.id);
    if (projects === null) { grid.innerHTML = '<div class="py-12 text-center text-error">Không thể tải các dự án đang đăng ký. Vui lòng thử lại.</div>'; return; }
    if (!projects.length) {
        grid.innerHTML = '<div class="py-xl flex flex-col items-center justify-center text-center bg-surface-container-lowest rounded-lg border border-dashed border-outline-variant"><div class="w-24 h-24 bg-surface-container-low rounded-full flex items-center justify-center mb-4 text-primary"><span class="material-symbols-outlined text-4xl">edit_document</span></div><h3 class="font-headline-md text-headline-md text-on-surface mb-2">Chưa có dự án đang đăng ký</h3><p class="font-body-md text-body-md text-on-surface-variant mb-6 max-w-md">Hãy chọn một dự án phù hợp để bắt đầu đăng ký.</p><a href="all-projects.html" class="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded-full">Khám phá Dự án</a></div>';
        return;
    }
    renderProjectsList(grid, projects);
}

function renderProjectsList(container, list) {
    if (!container) return;
    const isHomepageGrid = container.id === 'homepage-projects-grid';
    let html = '';
    list.forEach(p => {
        let statusClass = 'status-cho-xay-dung';
        if (p.status && p.status.includes('xây dựng')) statusClass = 'status-dang-xay-dung';
        if (p.status === 'Sắp nhận hồ sơ') statusClass = 'status-sap-nhan-ho-so';
        if (p.status && (p.status.includes('mở bán') || p.status.includes('nhận đơn'))) statusClass = 'status-dang-nhan-don';
        if (p.status && (p.status.includes('bàn giao') || p.status.includes('hoàn thành'))) statusClass = 'status-cho-ban-giao';
        const estimatedPrice = (p.details && p.details.estimatedPrice) ? p.details.estimatedPrice.trim().replace(/\s*\/?\s*m(?:2|²)?\s*$/i, '') : '';
        const compactPrice = value => value.replace(/^\s*(khoảng|từ)\s*/i, '').replace(/triệu(?:\s*đồng)?/gi, 'tr').replace(/\s+/g, ' ').trim();
        const priceLabel = estimatedPrice ? `~${compactPrice(estimatedPrice)}/m²` : (p.price || 'Đang cập nhật');
        const detailUrl = `details.html?id=${p.id}`;

        html += `
            <div class="project-card-item bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between" data-status="${p.status || ''}" data-date="${p.created_at || p.date || ''}" data-price="${p.price || p.price_per_sqm || ''}">
                <div>
                    <a href="${detailUrl}" class="project-card-thumbnail relative w-full rounded-lg overflow-hidden mb-3 bg-surface-container block">
                        <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'}" alt="${p.name || p.title}" class="w-full h-full object-cover">
                    </a>
                    <a href="${detailUrl}" class="block font-bold text-lg text-on-surface mb-1 hover:text-primary transition-colors"><h3>${p.name || p.title}</h3></a>
                    <p class="text-sm text-on-surface-variant flex items-center gap-1 mb-3">
                        <span class="material-symbols-outlined text-base">location_on</span> ${p.location}
                    </p>
                    <div class="project-card-project-info project-card-info-divider space-y-3 mb-3 pt-3 border-t-2 border-outline-variant/80 text-sm">
                        <span class="status-pill project-card-status-pill ${statusClass} block w-full text-center py-1.5 rounded-md text-xs font-semibold">${p.status || 'Đang mở bán'}</span>
                        <div class="flex flex-col gap-1">
                            <span class="text-on-surface-variant">Chủ đầu tư:</span>
                            <strong class="text-on-surface line-clamp-1">${p.owner || p.investor || 'Đang cập nhật'}</strong>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span class="text-on-surface-variant">Giá dự kiến:</span>
                            <strong class="text-on-surface">${priceLabel}</strong>
                        </div>
                    </div>
                </div>
                <a href="${detailUrl}" class="mt-1 w-full text-center px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-sm font-semibold transition-colors">Xem chi tiết</a>
            </div>
        `;
    });

    container.innerHTML = html;

    // Project cards are loaded asynchronously, so initialize the filters only
    // after the complete list is present in the all-projects grid.
    if (container.id === 'projects-grid') setupProjectFilterSort();
}

// 5. Fetch and Render Live Documents
function updateLegalDocumentsUpdateLabel() {
    const now = new Date();
    const label = `Cập nhật tới T${now.getMonth() + 1}/${now.getFullYear()}`;
    document.querySelectorAll('[data-legal-update-label]').forEach(element => {
        element.textContent = label;
    });
}

function getDocumentDownloadName(document) {
    const docType = String(document.doc_type || document.docType || 'PDF').toLowerCase();
    const extension = docType === 'docx' ? '.docx' : '.pdf';
    let name = String(document.name || document.title || 'tai-lieu').trim();
    name = name.replace(/[\\/:*?"<>|]/g, '-');
    return name.toLowerCase().endsWith(extension) ? name : `${name}${extension}`;
}

function getDocumentDownloadUrl(document) {
    const fileUrl = document.fileUrl || document.file || '';
    if (!fileUrl) return '#';
    const separator = fileUrl.includes('?') ? '&' : '?';
    return `${fileUrl}${separator}download=${encodeURIComponent(getDocumentDownloadName(document))}`;
}

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
                        <a href="${getDocumentDownloadUrl(d)}" class="px-2 md:px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 justify-center transition-colors">
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
    updateLegalDocumentsUpdateLabel();
    loadLiveProjects();
    loadLiveDocuments();
});

// Authenticated visitors should not see forms intended for a new login or signup.
async function redirectAuthenticatedUsersFromAuthPages() {
    const pageName = window.location.pathname.split('/').pop().toLowerCase();
    if (pageName !== 'login.html' && pageName !== 'signup.html') return;
    if (!window.SupabaseService) return;

    let session = window.SupabaseService.getAuthSession();
    const isSessionValid = currentSession => currentSession && currentSession.access_token &&
        (!currentSession.expires_at || currentSession.expires_at * 1000 > Date.now() + 5000);

    if (!isSessionValid(session) && session && session.refresh_token) {
        session = await window.SupabaseService.refreshAuthSession();
    }
    if (isSessionValid(session)) window.location.replace('homepage.html');
}

void redirectAuthenticatedUsersFromAuthPages();

/* INTERACTIVE COMPARE MODAL & LIVE SEARCH HANDLER */
let compareModalProjectsCache = [];
const COMPARE_PROJECTS_STORAGE_KEY = 'noxh_compare_project_ids';

function getComparedProjectIds() {
    try {
        const saved = JSON.parse(localStorage.getItem(COMPARE_PROJECTS_STORAGE_KEY) || '[]');
        return Array.isArray(saved) ? [...new Set(saved.map(String))].slice(0, 2) : [];
    } catch (_) {
        return [];
    }
}

async function loadLegalDocuments() {
    const container = document.getElementById('legal-documents-list');
    if (!container || !window.SupabaseService) return;
    try {
        const documents = await window.SupabaseService.getDocuments();
        const legalDocuments = (documents || []).filter(document => !document.isDraft && document.type === 'Văn bản luật');
        if (!legalDocuments.length) {
            container.innerHTML = '<div class="py-10 text-center flex flex-col items-center justify-center gap-2"><span class="material-symbols-outlined text-4xl text-outline-variant/60">gavel</span><span class="font-body-md text-on-surface-variant text-sm">Chưa có văn bản pháp luật</span></div>';
            return;
        }
        container.innerHTML = legalDocuments.map(document => `<a href="${getDocumentDownloadUrl(document)}" class="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/60 hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-between gap-4"><div class="flex items-center gap-3 min-w-0"><span class="material-symbols-outlined text-red-500 text-2xl">picture_as_pdf</span><div class="min-w-0"><p class="font-label-md text-label-md text-on-surface truncate">${escapeHtml(document.name)}</p>${document.desc ? `<p class="mt-1 text-sm text-on-surface-variant">${escapeHtml(document.desc)}</p>` : ''}</div></div><span class="material-symbols-outlined text-primary">download</span></a>`).join('');
    } catch (error) {
        console.error('Error loading legal documents:', error);
        container.innerHTML = '<p class="py-6 text-center text-sm text-on-surface-variant">Không thể tải văn bản pháp luật.</p>';
    }
}

async function loadDocumentSections() {
    if (!window.SupabaseService || !document.querySelector('.document-pack-button')) return;
    try {
        const documents = await window.SupabaseService.getDocuments();
        const findContent = title => Array.from(document.querySelectorAll('.accordion-header')).find(header => header.textContent.includes(title))?.nextElementSibling?.querySelector('.p-md');
        const renderList = (title, categories) => {
            const content = findContent(title);
            if (!content) return;
            const items = (documents || []).filter(document => !document.isDraft && categories.includes(document.type));
            content.innerHTML = items.length ? `<div class="flex flex-col gap-3">${items.map(document => `<a href="${getDocumentDownloadUrl(document)}" class="p-4 rounded-lg border border-outline-variant/60 hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-between gap-3"><div class="min-w-0"><p class="font-label-md text-label-md text-on-surface truncate">${escapeHtml(document.name)}</p><p class="mt-1 text-xs text-on-surface-variant">${escapeHtml(document.docType || 'PDF')} · ${escapeHtml(document.date || '')}</p></div><span class="material-symbols-outlined text-primary">download</span></a>`).join('')}</div>` : '<div class="py-8 text-center text-sm text-on-surface-variant">Chưa có tài liệu</div>';
        };
        renderList('Mua Nhà ở xã hội', ['Đơn mua', 'Bộ tài liệu - Mua Nhà ở xã hội']);
        renderList('Thuê Nhà ở xã hội', ['Đơn thuê', 'Bộ tài liệu - Thuê Nhà ở xã hội']);
        const packageCategories = ['Bộ tài liệu - Lao động tự do', 'Bộ tài liệu - Người đi làm', 'Bộ tài liệu - Người độc thân', 'Bộ tài liệu - Quân nhân/Công an'];
        document.querySelectorAll('.document-pack-button').forEach((button, index) => {
            const category = packageCategories[index];
            const packageFile = (documents || []).filter(document => !document.isDraft && document.type === category).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
            if (!packageFile) return;
            button.onclick = () => {
                const a = document.createElement('a');
                a.href = getDocumentDownloadUrl(packageFile);
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };
            button.title = packageFile.name;
            const label = button.querySelector('.document-pack-label');
            if (label) label.textContent = packageFile.name;
        });
    } catch (error) {
        console.error('Error loading document sections:', error);
    }
}

function saveComparedProjectIds(ids) {
    localStorage.setItem(COMPARE_PROJECTS_STORAGE_KEY, JSON.stringify([...new Set(ids.map(String))].slice(0, 2)));
}

window.removeProjectFromCompare = function(button) {
    const card = button && button.closest('.compare-project-card');
    if (!card) return;
    saveComparedProjectIds(getComparedProjectIds().filter(id => id !== String(card.dataset.projectId)));
    card.remove();
};

async function restoreCompareProjects() {
    const grid = document.getElementById('compare-grid-container');
    const ids = getComparedProjectIds();
    if (!grid || !ids.length || !window.SupabaseService) return;

    try {
        const projects = await window.SupabaseService.getProjects();
        compareModalProjectsCache = (projects || []).filter(project => !(project.details && project.details.isDraft));
        const availableIds = new Set(compareModalProjectsCache.map(project => String(project.id)));
        const validIds = ids.filter(id => availableIds.has(id));
        saveComparedProjectIds(validIds);
        validIds.forEach(id => {
            const project = compareModalProjectsCache.find(item => String(item.id) === id);
            if (project) window.addProjectToCompareList(project.id, project.name || project.title, project.location, project.status, project.progress);
        });
    } catch (error) {
        console.error('Không thể khôi phục danh sách so sánh:', error);
    }
}

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
                projects = (projects || []).filter(project => !(project.details && project.details.isDraft));
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
    if (grid.querySelector(`.compare-project-card[data-project-id="${String(id)}"]`)) {
        closeAddCompareModal();
        return;
    }

    // Render the same live data as the main project cards; never substitute a
    // stock image for a project image that has not been uploaded.
    const project = compareModalProjectsCache.find(p => String(p.id) === String(id)) || {};
    const projectTitle = project.name || project.title || title || 'Dự án';
    const projectLocation = project.location || location || 'Đang cập nhật';
    const projectStatus = project.status || status || 'Đang cập nhật';
    const investor = project.owner || project.investor || 'Đang cập nhật';
    const projectDetails = project.details || {};
    const projectScale = project.scale || projectDetails.scale || 'Đang cập nhật';
    const projectArea = project.area || projectDetails.area || 'Đang cập nhật';
    const projectHandover = project.handover || projectDetails.handover || 'Đang cập nhật';
    const rawEstimatedPrice = project.details && project.details.estimatedPrice
        ? String(project.details.estimatedPrice).trim().replace(/\s*\/?\s*m(?:2|²)?\s*$/i, '')
        : '';
    const compactPrice = value => value.replace(/^\s*(khoảng|từ)\s*/i, '').replace(/triệu(?:\s*đồng)?/gi, 'tr').replace(/\s+/g, ' ').trim();
    const priceLabel = rawEstimatedPrice ? `~${compactPrice(rawEstimatedPrice)}/m²` : (project.price || 'Đang cập nhật');
    const imageUrl = (project.details && (project.details.mainImageUrl || project.details.imageUrl || project.details.image_url)) || project.image_url || '';
    const detailUrl = `details.html?id=${encodeURIComponent(id)}`;
    let statusClass = 'status-cho-xay-dung';
    if (projectStatus === 'Đang xây dựng') statusClass = 'status-dang-xay-dung';
    if (projectStatus === 'Sắp nhận hồ sơ') statusClass = 'status-sap-nhan-ho-so';
    if (projectStatus.includes('nhận đơn')) statusClass = 'status-dang-nhan-don';
    if (projectStatus.includes('bàn giao') || projectStatus.includes('hoàn thành')) statusClass = 'status-cho-ban-giao';

    const card = document.createElement('div');
    card.className = 'compare-project-card project-card-item bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative';
    card.dataset.projectId = String(id);
    card.innerHTML = `
        <div>
            <button type="button" aria-label="Xóa dự án khỏi so sánh" onclick="removeProjectFromCompare(this)" class="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-white text-slate-700 border border-slate-200 shadow-md hover:bg-red-50 hover:text-red-600 hover:border-red-200 flex items-center justify-center transition-colors">
                <span class="material-symbols-outlined text-lg">close</span>
            </button>
            <a href="${detailUrl}" class="project-card-thumbnail relative w-full rounded-lg overflow-hidden mb-3 bg-surface-container block">
                ${imageUrl ? `<img src="${imageUrl}" alt="${projectTitle}" class="w-full h-full object-cover">` : '<div class="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400"><span class="material-symbols-outlined text-4xl">image</span></div>'}
            </a>
            <a href="${detailUrl}" class="block font-bold text-lg text-on-surface mb-1 hover:text-primary transition-colors"><h3>${projectTitle}</h3></a>
            <p class="text-sm text-on-surface-variant flex items-center gap-1 mb-3">
                <span class="material-symbols-outlined text-base">location_on</span> ${projectLocation}
            </p>
            <div class="project-card-project-info project-card-info-divider space-y-3 mb-3 pt-3 border-t-2 border-outline-variant/80 text-sm">
                <span class="status-pill project-card-status-pill ${statusClass} block w-full text-center py-1.5 rounded-md text-xs font-semibold">${projectStatus}</span>
                <div class="flex flex-col gap-1">
                    <span class="text-on-surface-variant">Chủ đầu tư:</span>
                    <strong class="text-on-surface line-clamp-1">${investor}</strong>
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-on-surface-variant">Giá dự kiến:</span>
                    <strong class="text-on-surface">${priceLabel}</strong>
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-on-surface-variant">Quy mô:</span>
                    <strong class="text-on-surface">${projectScale}</strong>
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-on-surface-variant">Diện tích:</span>
                    <strong class="text-on-surface">${projectArea}</strong>
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-on-surface-variant">Bàn giao:</span>
                    <strong class="text-on-surface">${projectHandover}</strong>
                </div>
            </div>
        </div>
        <a href="${detailUrl}" class="mt-1 w-full text-center px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-sm font-semibold transition-colors">Xem chi tiết</a>
    `;

    grid.insertBefore(card, grid.lastElementChild);
    saveComparedProjectIds([...getComparedProjectIds(), String(id)]);
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
        fileItem.className = 'flex items-center justify-between bg-surface-container py-1.5 px-2 md:px-4 rounded-lg border border-outline-variant/30';
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

// ==========================================
// LOAN CALCULATOR
// ==========================================
function initLoanCalculator() {
    const inputTotal = document.getElementById('input-total-price');
    if (!inputTotal) return; // Not on loan page
    
    let viewMode = 'month';
    const btnViewMonth = document.getElementById('btn-view-month');
    const btnViewYear = document.getElementById('btn-view-year');
    
    if (btnViewMonth && btnViewYear) {
        btnViewMonth.addEventListener('click', () => {
            viewMode = 'month';
            btnViewMonth.classList.add('bg-surface', 'shadow-sm', 'text-on-surface');
            btnViewMonth.classList.remove('text-on-surface-variant');
            btnViewYear.classList.remove('bg-surface', 'shadow-sm', 'text-on-surface');
            btnViewYear.classList.add('text-on-surface-variant');
            calculateLoan();
        });
        btnViewYear.addEventListener('click', () => {
            viewMode = 'year';
            btnViewYear.classList.add('bg-surface', 'shadow-sm', 'text-on-surface');
            btnViewYear.classList.remove('text-on-surface-variant');
            btnViewMonth.classList.remove('bg-surface', 'shadow-sm', 'text-on-surface');
            btnViewMonth.classList.add('text-on-surface-variant');
            calculateLoan();
        });
    }
    
    const rangeTotal = document.getElementById('range-total-price');
    const inputAvail = document.getElementById('input-available-money');
    const rangeAvail = document.getElementById('range-available-money');
    const inputTerm = document.getElementById('input-loan-term');
    const rangeTerm = document.getElementById('range-loan-term');
    
    const textNeedBorrow = document.getElementById('text-need-borrow');
    
    const bankRadios = document.querySelectorAll('input[name="bank_type"]');
    const promoPeriodsContainer = document.getElementById('promo-periods-container');
    const addPromoBtnWrapper = document.getElementById('add-promo-btn-wrapper');
    const btnAddPromo = document.getElementById('btn-add-promo');
    const rowInterest2 = document.getElementById('row-interest-2');
    const inputInterest2 = document.getElementById('input-interest-2');
    
    const methodRadios = document.querySelectorAll('input[name="repayment_method"]');
    
    const summaryTotal = document.getElementById('summary-total');
    const summaryAvail = document.getElementById('summary-available');
    const summaryBorrow = document.getElementById('summary-borrow');
    const summaryInterest = document.getElementById('summary-interest');
    const tbody = document.getElementById('schedule-tbody');
    const exportExcelButton = document.getElementById('btn-export-loan-excel');
    const validationModal = document.getElementById('loan-validation-modal');
    const focusLoanInputButton = document.getElementById('btn-focus-loan-input');
    let latestLoanCalculation = null;
    let validationFocusTarget = null;

    // Utility formatting
    function formatCurrency(num) {
        return num.toLocaleString('vi-VN');
    }
    
    function parseCurrency(str) {
        if (!str) return 0;
        return parseInt(str.toString().replace(/\./g, '').replace(/,/g, '')) || 0;
    }
    
    function updateCurrencyInput(inputEl, val) {
        inputEl.value = formatCurrency(val);
    }

    function getFirstMissingLoanInput() {
        if (!inputTotal.value.trim()) return inputTotal;
        if (!inputAvail.value.trim()) return inputAvail;
        if (!inputTerm.value.trim() || parseFloat(inputTerm.value) <= 0) return inputTerm;

        const bankType = document.querySelector('input[name="bank_type"]:checked').value;
        const promoRows = Array.from(promoPeriodsContainer.querySelectorAll('.promo-row'));
        for (const row of promoRows) {
            const rateInput = row.querySelector('.promo-rate-input');
            if (!rateInput.value.trim()) return rateInput;
            if (bankType === 'thuong_mai') {
                const timeInput = row.querySelector('.promo-time-input');
                if (!timeInput.value.trim() || parseFloat(timeInput.value) <= 0) return timeInput;
            }
        }
        if (bankType === 'thuong_mai' && (!inputInterest2.value.trim())) return inputInterest2;
        return null;
    }

    function showLoanValidationModal(input) {
        validationFocusTarget = input;
        if (!validationModal) return;
        validationModal.classList.remove('hidden');
        validationModal.classList.add('flex');
        focusLoanInputButton?.focus();
    }

    function closeLoanValidationModal() {
        if (!validationModal) return;
        validationModal.classList.add('hidden');
        validationModal.classList.remove('flex');
        if (validationFocusTarget) {
            validationFocusTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
            validationFocusTarget.focus({ preventScroll: true });
        }
    }

    function exportLoanExcel() {
        const missingInput = getFirstMissingLoanInput();
        if (missingInput || !latestLoanCalculation || latestLoanCalculation.schedule.length === 0) {
            showLoanValidationModal(missingInput || inputTerm);
            return;
        }
        if (!window.XLSX) {
            alert('Không thể tải thư viện xuất Excel. Vui lòng kiểm tra kết nối mạng và thử lại.');
            return;
        }

        const calculation = latestLoanCalculation;
        const scheduleName = 'Lịch trả nợ';
        const settingsSheet = XLSX.utils.aoa_to_sheet([
            ['Thông tin khoản vay', 'Giá trị'],
            ['Tổng giá trị căn hộ', calculation.total],
            ['Số tiền sẵn có', calculation.available],
            ['Tổng số tiền vay', calculation.borrow],
            ['Thời gian vay (năm)', calculation.termYears],
            ['Thời gian vay (tháng)', calculation.termMonths],
            ['Ngân hàng', calculation.bankName],
            ['Phương thức trả nợ', calculation.methodName],
            ['Lãi suất/Giai đoạn', calculation.rateDescription]
        ]);

        const scheduleSheet = XLSX.utils.aoa_to_sheet([
            ['Kỳ hạn', 'Gốc (đồng)', 'Lãi (đồng)', 'Tổng trả (đồng)', 'Dư nợ (đồng)'],
            ...calculation.schedule.map(item => [
                `Tháng ${item.month}`,
                Math.round(item.principalRepayment),
                Math.round(item.interest),
                Math.round(item.totalPayment),
                Math.round(item.remainingPrincipal)
            ])
        ]);

        const lastScheduleRow = calculation.schedule.length + 1;
        const summarySheet = XLSX.utils.aoa_to_sheet([
            ['Tổng hợp', 'Giá trị (đồng)'],
            ['Tổng giá trị căn hộ', calculation.total],
            ['Số tiền sẵn có', calculation.available],
            ['Tổng số tiền vay', calculation.borrow],
            ['Tổng tiền gốc phải trả', 0],
            ['Tổng tiền lãi dự kiến', 0],
            ['Tổng thanh toán dự kiến', 0]
        ]);
        summarySheet.B5 = { t: 'n', f: `SUM('${scheduleName}'!B2:B${lastScheduleRow})` };
        summarySheet.B6 = { t: 'n', f: `SUM('${scheduleName}'!C2:C${lastScheduleRow})` };
        summarySheet.B7 = { t: 'n', f: `SUM('${scheduleName}'!D2:D${lastScheduleRow})` };

        [settingsSheet, scheduleSheet, summarySheet].forEach(sheet => {
            Object.keys(sheet).forEach(key => {
                if (key[0] !== '!' && sheet[key].t === 'n') sheet[key].z = '#,##0';
            });
        });
        settingsSheet['!cols'] = [{ wch: 28 }, { wch: 26 }];
        scheduleSheet['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 }];
        summarySheet['!cols'] = [{ wch: 28 }, { wch: 22 }];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, settingsSheet, 'Thông tin vay');
        XLSX.utils.book_append_sheet(workbook, scheduleSheet, scheduleName);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tổng hợp');
        const date = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `lich-tra-no-${date}.xlsx`);
    }
    
    // Sync logic
    function syncInputRange(inputEl, rangeEl, isCurrency) {
        inputEl.addEventListener('focus', (e) => {
            if (e.target.value === '0' || e.target.value === '0 ₫') {
                e.target.value = '';
            }
        });

        inputEl.addEventListener('input', (e) => {
            let val = isCurrency ? parseCurrency(e.target.value) : parseFloat(e.target.value) || 0;
            if (val > parseFloat(rangeEl.max)) val = parseFloat(rangeEl.max);
            
            rangeEl.value = val;
            
            if (isCurrency && e.target.value !== '') {
                // Formatting on the fly
                let cursorPosition = e.target.selectionStart;
                let originalLength = e.target.value.length;
                
                e.target.value = formatCurrency(val);
                
                let newLength = e.target.value.length;
                cursorPosition = cursorPosition + (newLength - originalLength);
                try { e.target.setSelectionRange(cursorPosition, cursorPosition); } catch(err) {}
            }
            
            calculateLoan();
        });
        
        inputEl.addEventListener('blur', (e) => {
            let val = isCurrency ? parseCurrency(e.target.value) : parseFloat(e.target.value) || 0;
            if (val < parseFloat(rangeEl.min)) val = parseFloat(rangeEl.min);
            if (val > parseFloat(rangeEl.max)) val = parseFloat(rangeEl.max);
            
            if (isCurrency) {
                e.target.value = val === 0 ? '' : formatCurrency(val);
            } else {
                e.target.value = val === 0 ? '' : val;
            }
            rangeEl.value = val;
            calculateLoan();
        });
        
        rangeEl.addEventListener('input', (e) => {
            let val = parseFloat(e.target.value);
            if (isCurrency) {
                updateCurrencyInput(inputEl, val);
            } else {
                inputEl.value = val === 0 ? '' : val;
            }
            calculateLoan();
        });
    }

    syncInputRange(inputTotal, rangeTotal, true);
    syncInputRange(inputAvail, rangeAvail, true);
    syncInputRange(inputTerm, rangeTerm, false);
    
    if (inputInterest2) inputInterest2.addEventListener('input', calculateLoan);
    
    // Bind initial promo inputs
    document.querySelectorAll('.promo-rate-input, .promo-time-input').forEach(input => {
        input.addEventListener('input', calculateLoan);
    });
    
    bankRadios.forEach(r => r.addEventListener('change', () => {
        const bankType = document.querySelector('input[name="bank_type"]:checked').value;
        const firstRow = promoPeriodsContainer.querySelector('.promo-row');
        if (bankType === 'csxh') {
            firstRow.querySelector('.promo-time-col').classList.add('hidden');
            firstRow.querySelector('.promo-rate-label').textContent = 'Lãi suất xuyên suốt';
            if (addPromoBtnWrapper) addPromoBtnWrapper.classList.add('hidden');
            if (rowInterest2) rowInterest2.classList.add('hidden');
            
            // Hide/remove all subsequent promo rows
            const rows = promoPeriodsContainer.querySelectorAll('.promo-row');
            rows.forEach((row, idx) => {
                if (idx > 0) row.remove();
            });
        } else {
            firstRow.querySelector('.promo-time-col').classList.remove('hidden');
            firstRow.querySelector('.promo-rate-label').textContent = 'Lãi suất (ưu đãi) 1';
            if (addPromoBtnWrapper) addPromoBtnWrapper.classList.remove('hidden');
            if (rowInterest2) rowInterest2.classList.remove('hidden');
        }
        calculateLoan();
    }));
    
    if (btnAddPromo) {
        btnAddPromo.addEventListener('click', () => {
            const rows = promoPeriodsContainer.querySelectorAll('.promo-row');
            const rowCount = rows.length;
            
            const firstRow = rows[0];
            const newRow = firstRow.cloneNode(true);
            
            newRow.querySelector('.promo-rate-label').textContent = 'Lãi suất (ưu đãi) ' + (rowCount + 1);
            newRow.querySelector('.promo-rate-input').value = '';
            newRow.querySelector('.promo-time-input').value = '';
            
            const deleteCol = newRow.querySelector('.promo-delete-col');
            deleteCol.classList.remove('hidden');
            deleteCol.innerHTML = `<button type="button" class="text-error hover:text-error/80 transition-colors flex items-center justify-center pt-0.5" title="Xóa giai đoạn"><span class="material-symbols-outlined text-[20px] block leading-none">delete</span></button>`;
            
            deleteCol.querySelector('button').addEventListener('click', () => {
                newRow.remove();
                updatePromoLabels();
                calculateLoan();
            });
            
            newRow.querySelectorAll('input').forEach(input => {
                input.addEventListener('input', calculateLoan);
            });
            
            promoPeriodsContainer.appendChild(newRow);
        });
    }
    
    function updatePromoLabels() {
        const rows = promoPeriodsContainer.querySelectorAll('.promo-row');
        rows.forEach((row, idx) => {
            row.querySelector('.promo-rate-label').textContent = 'Lãi suất (ưu đãi) ' + (idx + 1);
        });
    }
    
    methodRadios.forEach(r => r.addEventListener('change', calculateLoan));
    if (exportExcelButton) exportExcelButton.addEventListener('click', exportLoanExcel);
    if (focusLoanInputButton) focusLoanInputButton.addEventListener('click', closeLoanValidationModal);
    if (validationModal) {
        validationModal.addEventListener('click', event => {
            if (event.target === validationModal) closeLoanValidationModal();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !validationModal.classList.contains('hidden')) closeLoanValidationModal();
        });
    }

    function calculateLoan() {
        const total = parseCurrency(inputTotal.value);
        let avail = parseCurrency(inputAvail.value);
        if (avail > total) {
            avail = total;
            updateCurrencyInput(inputAvail, avail);
            rangeAvail.value = avail;
        }
        const borrow = total - avail;
        if (textNeedBorrow) textNeedBorrow.textContent = formatCurrency(borrow);
        
        if (summaryTotal) summaryTotal.textContent = formatCurrency(total) + ' ₫';
        if (summaryAvail) summaryAvail.textContent = formatCurrency(avail) + ' ₫';
        if (summaryBorrow) summaryBorrow.textContent = formatCurrency(borrow) + ' ₫';
        
        if (borrow <= 0) {
            if (summaryInterest) summaryInterest.textContent = '0 ₫';
            if (tbody) tbody.innerHTML = '';
            latestLoanCalculation = null;
            return;
        }
        
        const termYears = parseFloat(inputTerm.value) || 0;
        const termMonths = termYears * 12;
        const bankType = document.querySelector('input[name="bank_type"]:checked').value;
        const method = document.querySelector('input[name="repayment_method"]:checked').value;
        
        let promoPeriods = [];
        const promoRows = promoPeriodsContainer.querySelectorAll('.promo-row');
        if (bankType === 'thuong_mai') {
            promoRows.forEach(row => {
                const rRate = (parseFloat(row.querySelector('.promo-rate-input').value) || 0) / 100 / 12;
                const rTime = parseFloat(row.querySelector('.promo-time-input').value) || 0;
                promoPeriods.push({ rate: rRate, months: rTime });
            });
        } else {
            const rRate = (parseFloat(promoRows[0].querySelector('.promo-rate-input').value) || 0) / 100 / 12;
            promoPeriods.push({ rate: rRate, months: termMonths });
        }
        
        const rate2 = (parseFloat(inputInterest2.value) || 0) / 100 / 12;
        
        function getRateForMonth(month) {
            let currentMonthSum = 0;
            for (let i = 0; i < promoPeriods.length; i++) {
                currentMonthSum += promoPeriods[i].months;
                if (month <= currentMonthSum) {
                    return promoPeriods[i].rate;
                }
            }
            return rate2;
        }
        
        let totalInterest = 0;
        let scheduleHtml = '';
        let scheduleData = [];
        
        let remainingPrincipal = borrow;
        let monthlyPrincipal = method === 'giam_dan' ? borrow / termMonths : 0;
        
        let currentPmt = 0;
        let lastRate = -1;
        
        for (let i = 1; i <= termMonths; i++) {
            const currentRate = getRateForMonth(i);
            let interest = remainingPrincipal * currentRate;
            
            if (method === 'deu' && (i === 1 || currentRate !== lastRate)) {
                const remainingMonths = termMonths - i + 1;
                if (currentRate > 0) {
                    currentPmt = remainingPrincipal * currentRate * Math.pow(1+currentRate, remainingMonths) / (Math.pow(1+currentRate, remainingMonths) - 1);
                } else {
                    currentPmt = remainingPrincipal / remainingMonths;
                }
                lastRate = currentRate;
            }
            
            let principalRepayment = 0;
            if (method === 'giam_dan') {
                principalRepayment = monthlyPrincipal;
                if (i === termMonths) principalRepayment = remainingPrincipal;
            } else { // deu
                principalRepayment = currentPmt - interest;
                if (i === termMonths) principalRepayment = remainingPrincipal;
            }
            
            totalInterest += interest;
            let totalPayment = principalRepayment + interest;
            remainingPrincipal -= principalRepayment;
            if (remainingPrincipal < 0) remainingPrincipal = 0;
            
            scheduleData.push({ month: i, principalRepayment, interest, totalPayment, remainingPrincipal });
        }
        
        if (viewMode === 'year') {
            let totalYears = Math.ceil(termMonths / 12);
            for (let y = 0; y < totalYears; y++) {
                let startIdx = y * 12;
                let yearMonths = scheduleData.slice(startIdx, startIdx + 12);
                if (yearMonths.length === 0) break;
                
                let yPrincipal = yearMonths.reduce((sum, m) => sum + m.principalRepayment, 0);
                let yInterest = yearMonths.reduce((sum, m) => sum + m.interest, 0);
                let yTotal = yearMonths.reduce((sum, m) => sum + m.totalPayment, 0);
                let yRemaining = yearMonths[yearMonths.length - 1].remainingPrincipal;
                
                scheduleHtml += `
                <tr class="border-b border-outline-variant/20 hover:bg-surface-container transition-colors">
                <td class="py-3 px-2 md:px-4 text-on-background align-middle text-center whitespace-nowrap">Năm ${y + 1}</td>
                <td class="py-3 px-2 md:px-4 text-on-surface-variant text-center align-middle whitespace-nowrap">${formatCurrency(Math.round(yPrincipal))}</td>
                <td class="py-3 px-2 md:px-4 text-on-surface-variant text-center align-middle whitespace-nowrap">${formatCurrency(Math.round(yInterest))}</td>
                <td class="py-3 px-2 md:px-4 text-primary font-medium text-center align-middle whitespace-nowrap">${formatCurrency(Math.round(yTotal))}</td>
                <td class="py-3 px-2 md:px-4 text-on-background text-center align-middle whitespace-nowrap">${formatCurrency(Math.round(yRemaining))}</td>
                </tr>`;
            }
        } else {
            for (let m of scheduleData) {
                scheduleHtml += `
                <tr class="border-b border-outline-variant/20 hover:bg-surface-container transition-colors">
                <td class="py-3 px-2 md:px-4 text-on-background align-middle text-center whitespace-nowrap">Tháng ${m.month}</td>
                <td class="py-3 px-2 md:px-4 text-on-surface-variant text-center align-middle whitespace-nowrap">${formatCurrency(Math.round(m.principalRepayment))}</td>
                <td class="py-3 px-2 md:px-4 text-on-surface-variant text-center align-middle whitespace-nowrap">${formatCurrency(Math.round(m.interest))}</td>
                <td class="py-3 px-2 md:px-4 text-primary font-medium text-center align-middle whitespace-nowrap">${formatCurrency(Math.round(m.totalPayment))}</td>
                <td class="py-3 px-2 md:px-4 text-on-background text-center align-middle whitespace-nowrap">${formatCurrency(Math.round(m.remainingPrincipal))}</td>
                </tr>`;
            }
        }
        
        if (summaryInterest) summaryInterest.textContent = formatCurrency(Math.round(totalInterest)) + ' ₫';
        if (tbody) tbody.innerHTML = scheduleHtml;
        const rateDescription = Array.from(promoRows).map((row, index) => {
            const rate = row.querySelector('.promo-rate-input').value || '0';
            const months = row.querySelector('.promo-time-input').value;
            return bankType === 'csxh' ? `${rate}%/năm` : `Giai đoạn ${index + 1}: ${rate}%/năm trong ${months || 0} tháng`;
        }).join('; ');
        latestLoanCalculation = {
            total,
            available: avail,
            borrow,
            termYears,
            termMonths,
            bankName: bankType === 'csxh' ? 'Ngân hàng Chính sách Xã hội' : 'Ngân hàng thương mại',
            methodName: method === 'giam_dan' ? 'Dư nợ giảm dần' : 'Gốc và lãi trả đều',
            rateDescription,
            schedule: scheduleData
        };
    }
    
    calculateLoan();
}

function setupScrollDownBtn() {
    const btn = document.getElementById('scroll-down-btn');
    if (!btn) return;
    
    // Remove old listeners to prevent duplication on SPA navigation
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById('featured-projects');
        if (!target) return;
        
        // Find visible navbar (mobile or desktop)
        const mobileNav = document.querySelector('.top-navbar');
        const desktopNav = document.querySelector('.top-navbar-desktop');
        
        let navbarHeight = 0;
        if (mobileNav && window.getComputedStyle(mobileNav).display !== 'none') {
            navbarHeight = mobileNav.offsetHeight + parseInt(window.getComputedStyle(mobileNav).marginTop || 0);
        } else if (desktopNav && window.getComputedStyle(desktopNav).display !== 'none') {
            navbarHeight = desktopNav.offsetHeight + parseInt(window.getComputedStyle(desktopNav).marginTop || 0);
        }
        
        // Gap below navbar
        const gap = 16;
        
        // Calculate scroll position
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - navbarHeight - gap;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    });
}
