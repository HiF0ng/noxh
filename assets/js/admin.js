const API_BASE_URL = 'http://localhost:3000/api/v1';

// Admin and public website sessions are intentionally isolated.
if (window.SupabaseService) {
    window.SupabaseService.setAuthContext('admin');
    window.SupabaseService.migrateLegacyAdminSession();
}

function checkAdminSessionExpiration() {
    var session = window.SupabaseService && window.SupabaseService.getAuthSession();
    var expiresAt = Number(localStorage.getItem('adminSessionExpiresAt') || 0);
    if (!session || !session.access_token || !expiresAt || Date.now() >= expiresAt) {
        localStorage.removeItem('adminSessionExpiresAt');
        localStorage.removeItem('adminUser');
        window.location.href = 'admin-login.html';
        return false;
    }
    return true;
}

window.handleAdminLogout = function() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống Admin Central?')) {
        localStorage.removeItem('adminUser');
        localStorage.removeItem('adminSessionExpiresAt');
        Promise.resolve(window.SupabaseService && window.SupabaseService.signOut()).finally(function() {
            window.location.href = 'admin-login.html';
        });
    }
};

/* ============================================
   ADMIN SPA - JavaScript
   File: assets/js/admin.js
   Description: SPA Router, Sidebar, Upload, Charts
   ============================================ */

(function() {
    'use strict';

    var isDataLoaded = false;

    // ---- SPA Router ---- //
    const PAGES = {
        'dashboard':     { title: 'Tổng quan',           parent: null },
        'users':         { title: 'Người dùng',          parent: null },
        'projects':      { title: 'Danh sách dự án',     parent: 'projects' },
        'projects-new':  { title: 'Thêm dự án mới',      parent: 'projects' },
        'docs':          { title: 'Danh sách tài liệu',  parent: 'docs' },
        'docs-packages': { title: 'Bộ tài liệu',          parent: 'docs' },
        'docs-new':      { title: 'Tải lên tài liệu',    parent: 'docs' },
        'docs-guide':    { title: 'Hướng dẫn điền',      parent: 'docs' },
        'faq':           { title: 'FAQ',                  parent: null },
        'news':          { title: 'Danh sách tin tức',    parent: 'news' },
        'news-new':      { title: 'Tạo tin mới',         parent: 'news' },
    };

    const PARENT_LABELS = {
        'projects': 'Dự án',
        'docs':     'Tài liệu',
        'news':     'Tin tức',
    };

    function getCurrentPage() {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        return PAGES[hash] ? hash : 'dashboard';
    }

    function navigateTo(page) {
        window.location.hash = '#' + page;
    }

    function onRouteChange() {
        const page = getCurrentPage();
        const pageInfo = PAGES[page];

        // Hide all sections, show current
        document.querySelectorAll('.page-section').forEach(function(s) {
            s.classList.remove('active');
        });
        var target = document.getElementById('page-' + page);
        if (target) {
            target.classList.add('active');
        }

        // Update breadcrumb
        updateBreadcrumb(page, pageInfo);

        // Update sidebar active states
        updateSidebar(page, pageInfo);

        // Initialize page-specific features
        if (page === 'dashboard') {
            if (isDataLoaded) {
                initDashboardChart();
            }
        }
        if (page === 'users') {
            initUserModule();
        }
        if (page === 'projects') {
            initProjectsModule();
        }
        if (page === 'projects-new') {
            if (!isEditingProjectSession) {
                resetProjectNewForm();
            }
            // Bind form actions here as well so direct links to #projects-new work.
            initProjectsModule();
            // Consume edit session so any subsequent route change resets form
            isEditingProjectSession = false;
        } else {
            resetProjectNewForm();
        }
        if (page === 'docs') {
            localStorage.removeItem('noxh_document_edit_id');
            localStorage.removeItem('noxh_document_draft_key');
            initDocsFilter();
            renderAdminDocuments();
        }
        if (page === 'docs-packages') {
            initDocumentPackageUploads();
        }
        if (page === 'docs-new') {
            initDropzones();
            initDocumentUploadForm();
        }
        if (page === 'faq') {
            initFaqModule();
        }
        if (page === 'docs-guide') {
            initDocsGuideModule();
        }
    }

    // ---- Breadcrumb ---- //
    function updateBreadcrumb(page, pageInfo) {
        var bc = document.getElementById('breadcrumb');
        if (!bc) return;

        var parentLabel = '';
        if (pageInfo.parent && PARENT_LABELS[pageInfo.parent]) {
            parentLabel = '<span class="text-on-surface">Quản trị</span>' +
                '<span class="material-symbols-outlined text-[16px]">chevron_right</span>' +
                '<span class="text-on-surface">' + PARENT_LABELS[pageInfo.parent] + '</span>' +
                '<span class="material-symbols-outlined text-[16px]">chevron_right</span>';
        } else {
            parentLabel = '<span class="text-on-surface">Quản trị</span>' +
                '<span class="material-symbols-outlined text-[16px]">chevron_right</span>';
        }

        bc.innerHTML = parentLabel + '<span class="current">' + pageInfo.title + '</span>';
    }

    // ---- Sidebar ---- //
    function updateSidebar(page, pageInfo) {
        // Remove all active states
        document.querySelectorAll('.nav-item').forEach(function(item) {
            item.classList.remove('active');
        });
        document.querySelectorAll('.nav-parent').forEach(function(p) {
            p.classList.remove('expanded');
        });
        document.querySelectorAll('.nav-submenu-item').forEach(function(s) {
            s.classList.remove('active');
        });

        // Simple nav items (no children)
        var simpleLink = document.querySelector('.nav-item[data-page="' + page + '"]');
        if (simpleLink) {
            simpleLink.classList.add('active');
        }

        // Expandable parent items
        if (pageInfo.parent) {
            var parent = document.querySelector('.nav-parent[data-parent="' + pageInfo.parent + '"]');
            if (parent) {
                parent.classList.add('expanded');
            }
            var subItem = document.querySelector('.nav-submenu-item[data-page="' + page + '"]');
            if (subItem) {
                subItem.classList.add('active');
            }
        }
    }

    // ---- Sidebar Click Handlers ---- //
    function initSidebar() {
        // Simple nav items
        document.querySelectorAll('.nav-item[data-page]').forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                var destPage = this.getAttribute('data-page');
                if (destPage === 'docs' || destPage === 'docs-new') {
                    localStorage.removeItem('noxh_document_edit_id');
                    localStorage.removeItem('noxh_document_draft_key');
                }
                navigateTo(destPage);
            });
        });

        // Parent headers (toggle expand)
        document.querySelectorAll('.nav-parent-header').forEach(function(header) {
            header.addEventListener('click', function(e) {
                e.preventDefault();
                var parent = this.closest('.nav-parent');
                var defaultPage = parent.getAttribute('data-default') || parent.getAttribute('data-parent');
                
                if (parent.classList.contains('expanded')) {
                    // If already expanded, navigate to default sub-page
                    navigateTo(defaultPage);
                } else {
                    // Expand and navigate
                    navigateTo(defaultPage);
                }
            });
        });

        // Submenu items
        document.querySelectorAll('.nav-submenu-item[data-page]').forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                var destPage = this.getAttribute('data-page');
                if (destPage === 'docs' || destPage === 'docs-new') {
                    localStorage.removeItem('noxh_document_edit_id');
                    localStorage.removeItem('noxh_document_draft_key');
                }
                navigateTo(destPage);
            });
        });

        // Mobile menu toggle
        var mobileBtn = document.getElementById('mobile-menu-btn');
        var closeBtn = document.getElementById('close-menu-btn');
        var sidebar = document.getElementById('admin-sidebar');

        if (mobileBtn && sidebar) {
            mobileBtn.addEventListener('click', function() {
                sidebar.classList.add('open');
            });
        }
        if (closeBtn && sidebar) {
            closeBtn.addEventListener('click', function() {
                sidebar.classList.remove('open');
            });
        }
    }

    // ---- Dashboard Charts ---- //
    var chartInstanceAccess = null;
    var chartInstanceRegistered = null;

    // Helper tạo 60 mốc ngày liên tục cho 60 ngày gần nhất
    function generateDailySeries(startDay, startMonth, startYear, count, startVal, endVal, waveFreq) {
        var labels = [];
        var data = [];
        var current = new Date(startYear, startMonth - 1, startDay);

        for (var i = 0; i < count; i++) {
            var d = current.getDate();
            var m = current.getMonth() + 1;
            var y = current.getFullYear();
            var dateStr = (d < 10 ? '0' + d : d) + '/' + (m < 10 ? '0' + m : m) + '/' + y;
            labels.push(dateStr);

            var t = i / (count - 1);
            var trend = startVal + (endVal - startVal) * Math.pow(t, 1.2);
            var wave = Math.sin(i * waveFreq) * (endVal - startVal) * 0.04;
            data.push(Math.round(trend + wave));

            current.setDate(current.getDate() + 1);
        }
        return { labels: labels, data: data };
    }

    var accessDailyData = { labels: [], data: [] };
    var registeredDailyData = { labels: [], data: [] };

    var commonChartOptions = function(yFormatSuffix) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false,
                    backgroundColor: '#0b1c30',
                    titleColor: '#ffffff',
                    titleFont: { family: 'Be Vietnam Pro', size: 13, weight: '600' },
                    bodyColor: '#eaf1ff',
                    bodyFont: { family: 'Be Vietnam Pro', size: 13 },
                    borderColor: 'rgba(195, 198, 215, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true,
                    boxPadding: 4,
                    callbacks: {
                        title: function(tooltipItems) {
                            return '📅 Ngày: ' + tooltipItems[0].label;
                        },
                        label: function(context) {
                            var value = context.parsed.y.toLocaleString('vi-VN');
                            return '  ' + context.dataset.label + ': ' + value + (yFormatSuffix || '');
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        display: false // Ẩn các mốc ngày ở dòng dưới chart theo yêu cầu
                    }
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: 10,
                    grid: { color: 'rgba(195, 198, 215, 0.3)' },
                    ticks: {
                        font: { family: 'Be Vietnam Pro', size: 12 },
                        color: '#737686',
                        stepSize: 1
                    }
                }
            }
        };
    };

    function loadDashboardMetrics() {
        function animateValue(obj, start, end, duration, formatStr = '') {
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const easeOut = progress * (2 - progress);
                const currentVal = Math.floor(easeOut * (end - start) + start);
                
                if (formatStr === 'time') {
                    const m = Math.floor(currentVal / 60).toString().padStart(2, '0');
                    const s = (currentVal % 60).toString().padStart(2, '0');
                    obj.textContent = m + ':' + s;
                } else if (formatStr === 'percent') {
                    obj.textContent = (easeOut * (end - start) + start).toFixed(1) + '%';
                } else {
                    obj.textContent = currentVal.toLocaleString('vi-VN');
                }
                
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    if (formatStr === 'time') {
                        const m = Math.floor(end / 60).toString().padStart(2, '0');
                        const s = (end % 60).toString().padStart(2, '0');
                        obj.textContent = m + ':' + s;
                    } else if (formatStr === 'percent') {
                        obj.textContent = end.toFixed(1) + '%';
                    } else {
                        obj.textContent = end.toLocaleString('vi-VN');
                    }
                }
            };
            window.requestAnimationFrame(step);
        }

        // Read from tracker
        const visits = parseInt(localStorage.getItem('noxh_total_visits') || '0');
        const totalDuration = parseInt(localStorage.getItem('noxh_total_duration') || '0');
        const sessionCount = parseInt(localStorage.getItem('noxh_session_count') || '0');
        const avgDuration = sessionCount > 0 ? Math.floor(totalDuration / sessionCount) : 0;
        
        const bounces = parseInt(localStorage.getItem('noxh_bounce_count') || '0');
        const bounceRate = sessionCount > 0 ? (bounces / sessionCount) * 100 : 0;

        const unreg = parseInt(localStorage.getItem('noxh_unregistered_users') || '0');

        const elVisits = document.getElementById('dash-stat-visits');
        if (elVisits && elVisits.textContent === '--') animateValue(elVisits, 0, visits, 1500);
        
        const elDuration = document.getElementById('dash-stat-duration');
        if (elDuration && elDuration.textContent === '--') animateValue(elDuration, 0, avgDuration, 1500, 'time');
        
        const elBounce = document.getElementById('dash-stat-bounce');
        if (elBounce && elBounce.textContent === '--') animateValue(elBounce, 0, bounceRate, 1500, 'percent');
        
        const elUnreg = document.getElementById('dash-stat-unreg');
        if (elUnreg && elUnreg.textContent === '--') animateValue(elUnreg, 0, unreg, 1500);

        const elReg = document.getElementById('dash-stat-reg');
        if (elReg && typeof usersList !== 'undefined') {
            if (elReg.textContent === '--') animateValue(elReg, 0, usersList.length, 1000);
            else elReg.textContent = usersList.length.toLocaleString('vi-VN');
        }

        const elSupport = document.getElementById('dash-stat-support');
        if (elSupport && typeof SupabaseService !== 'undefined') {
            if (typeof SupabaseService.getFeedbacks === 'function') {
                SupabaseService.getFeedbacks().then(feedbacks => {
                    const count = feedbacks ? feedbacks.length : 0;
                    if (elSupport.textContent === '--') animateValue(elSupport, 0, count, 1000);
                    else elSupport.textContent = count.toLocaleString('vi-VN');
                }).catch(e => {
                    console.error(e);
                    elSupport.textContent = '0';
                });
            } else {
                if (elSupport.textContent === '--') animateValue(elSupport, 0, 0, 1000);
                else elSupport.textContent = '0';
            }
        }
    }

    function prepareChartData() {
        const today = new Date();
        const historyLength = 60;
        
        accessDailyData.labels = [];
        accessDailyData.data = [];
        registeredDailyData.labels = [];
        registeredDailyData.data = [];

        const userCountsByDate = {};
        if (typeof usersList !== 'undefined') {
            usersList.forEach(u => {
                if (!userCountsByDate[u.date]) userCountsByDate[u.date] = 0;
                userCountsByDate[u.date]++;
            });
        }

        const currentVisits = parseInt(localStorage.getItem('noxh_total_visits') || '0');

        for (let i = historyLength - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            const fullDateStr = d.toLocaleDateString('vi-VN');

            accessDailyData.labels.push(dateStr);
            registeredDailyData.labels.push(dateStr);

            // No mockdata! Only actual tracked visits for today, past 59 days are 0.
            if (i === 0) {
                accessDailyData.data.push(currentVisits);
            } else {
                accessDailyData.data.push(0);
            }

            registeredDailyData.data.push(userCountsByDate[fullDateStr] || 0);
        }
    }

    function initDashboardChart() {
        loadDashboardMetrics();
        prepareChartData();
        // 1. Chart: Tăng trưởng truy cập
        var canvasAccess = document.getElementById('applicationsChart');
        if (canvasAccess) {
            try {
                if (chartInstanceAccess) chartInstanceAccess.destroy();
                var ctxAccess = canvasAccess.getContext('2d');
                chartInstanceAccess = new Chart(ctxAccess, {
                    type: 'line',
                    data: {
                        labels: accessDailyData.labels,
                        datasets: [{
                            label: 'Lượt truy cập',
                            data: accessDailyData.data,
                            borderColor: '#2563eb',
                            backgroundColor: 'rgba(37, 99, 235, 0.08)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: '#ffffff',
                            pointHoverBorderColor: '#2563eb',
                            pointHoverBorderWidth: 3
                        }]
                    },
                    options: commonChartOptions(' lượt')
                });
            } catch (err) {
                console.error("Lỗi vẽ Chart 1:", err);
                canvasAccess.parentElement.innerHTML = '<div class="text-red-500 p-4">Lỗi vẽ biểu đồ truy cập: ' + err.message + '</div>';
            }
        }

        // 2. Chart: Tăng trưởng người đăng ký
        var canvasRegistered = document.getElementById('registeredUsersChart');
        if (canvasRegistered) {
            try {
                if (chartInstanceRegistered) chartInstanceRegistered.destroy();
                var ctxRegistered = canvasRegistered.getContext('2d');
                chartInstanceRegistered = new Chart(ctxRegistered, {
                    type: 'line',
                    data: {
                        labels: registeredDailyData.labels,
                        datasets: [{
                            label: 'Người đăng ký mới',
                            data: registeredDailyData.data,
                            borderColor: '#006c49',
                            backgroundColor: 'rgba(0, 108, 73, 0.08)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: '#ffffff',
                            pointHoverBorderColor: '#006c49',
                            pointHoverBorderWidth: 3
                        }]
                    },
                    options: commonChartOptions(' người')
                });
            } catch (err) {
                console.error("Lỗi vẽ Chart 2:", err);
                canvasRegistered.parentElement.innerHTML = '<div class="text-red-500 p-4">Lỗi vẽ biểu đồ người đăng ký: ' + err.message + '</div>';
            }
        }
    }

    // ---- Drag-and-Drop Upload Zones ---- //
    function initDropzones() {
        setupDropzone('pdf-dropzone', 'pdf-input');
        setupDropzone('docx-dropzone', 'docx-input');
    }

    function initDocumentUploadForm() {
        var category = document.getElementById('doc-upload-category');
        var docxSection = document.getElementById('docx-upload-section');
        var docxInput = document.getElementById('docx-input');
        var saveButton = document.getElementById('btn-save-document');
        var draftButton = document.getElementById('btn-save-document-draft');
        if (!category || !saveButton) return;
        var draftStorageKey = 'noxh_document_draft_key';
        var draftKey = localStorage.getItem(draftStorageKey) || '';
        var activeDrafts = [];

        var syncAttachments = function() {
            var isLegalDocument = category.value === 'Văn bản luật';
            if (docxSection) docxSection.classList.toggle('hidden', isLegalDocument);
            if (isLegalDocument && docxInput) docxInput.value = '';
        };
        category.onchange = syncAttachments;
        syncAttachments();

        var removeDrafts = async function(keepFiles) {
            for (var i = 0; i < activeDrafts.length; i++) {
                await window.SupabaseService.deleteDocument(activeDrafts[i].id, { keepFile: !!keepFiles });
            }
            activeDrafts = [];
            localStorage.removeItem(draftStorageKey);
        };

        var editId = localStorage.getItem('noxh_document_edit_id') || '';
        var activeEditDoc = null;
        var activeEditDocFileDeleted = false;

        var loadDraft = async function() {
            var pdfFileLabel = document.getElementById('pdf-selected-file');
            var docxFileLabel = document.getElementById('docx-selected-file');
            if (pdfFileLabel) { pdfFileLabel.textContent = ''; pdfFileLabel.classList.add('hidden'); }
            if (docxFileLabel) { docxFileLabel.textContent = ''; docxFileLabel.classList.add('hidden'); }
            var pdfInput = document.getElementById('pdf-input');
            var docxInput = document.getElementById('docx-input');
            if (pdfInput) pdfInput.value = '';
            if (docxInput) docxInput.value = '';
            
            var pdfExistingOverlay = document.getElementById('pdf-existing-file');
            var docxExistingOverlay = document.getElementById('docx-existing-file');
            if (pdfExistingOverlay) pdfExistingOverlay.classList.add('hidden');
            if (docxExistingOverlay) docxExistingOverlay.classList.add('hidden');
            activeEditDocFileDeleted = false;

            if (editId && window.SupabaseService) {
                var documents = await window.SupabaseService.getDocuments();
                activeEditDoc = (documents || []).find(function(doc) { return doc.id == editId; });
                if (activeEditDoc) {
                    document.getElementById('doc-upload-name').value = activeEditDoc.name || '';
                    document.getElementById('doc-upload-content').value = activeEditDoc.desc || '';
                    category.value = activeEditDoc.type || 'Đơn mua';
                    syncAttachments();
                    var titleEl = document.querySelector('#page-docs-new h2');
                    if (titleEl) titleEl.textContent = 'Chỉnh sửa tài liệu';
                    saveButton.textContent = 'Cập nhật tài liệu';
                    if (draftButton) draftButton.classList.add('hidden');
                    
                    if (activeEditDoc.file) {
                        var isLegal = category.value === 'Văn bản luật';
                        var fileName = activeEditDoc.file.split('/').pop().split('?')[0];
                        try { fileName = decodeURIComponent(fileName); } catch(e){}
                        
                        if (activeEditDoc.docType === 'PDF' || isLegal) {
                            if (pdfExistingOverlay) {
                                document.getElementById('pdf-existing-link').textContent = fileName || 'Tài liệu PDF';
                                document.getElementById('pdf-existing-link').href = activeEditDoc.file;
                                pdfExistingOverlay.classList.remove('hidden');
                                document.getElementById('pdf-existing-delete').onclick = function(e) {
                                    e.preventDefault(); e.stopPropagation();
                                    pdfExistingOverlay.classList.add('hidden');
                                    activeEditDocFileDeleted = true;
                                };
                                document.getElementById('pdf-existing-link').onclick = function(e) { e.stopPropagation(); };
                            }
                        } else if (activeEditDoc.docType === 'DOCX') {
                            if (docxExistingOverlay) {
                                document.getElementById('docx-existing-link').textContent = fileName || 'Tài liệu Word';
                                document.getElementById('docx-existing-link').href = activeEditDoc.file;
                                docxExistingOverlay.classList.remove('hidden');
                                document.getElementById('docx-existing-delete').onclick = function(e) {
                                    e.preventDefault(); e.stopPropagation();
                                    docxExistingOverlay.classList.add('hidden');
                                    activeEditDocFileDeleted = true;
                                };
                                document.getElementById('docx-existing-link').onclick = function(e) { e.stopPropagation(); };
                            }
                        }
                    }
                    return;
                } else {
                    localStorage.removeItem('noxh_document_edit_id');
                    editId = '';
                }
            } else {
                var titleEl = document.querySelector('#page-docs-new h2');
                if (titleEl) titleEl.textContent = 'Tải lên tài liệu mới';
                saveButton.textContent = 'Lưu tài liệu';
                if (draftButton) draftButton.classList.remove('hidden');
                document.getElementById('doc-upload-name').value = '';
                document.getElementById('doc-upload-content').value = '';
                category.value = 'Đơn mua';
                syncAttachments();
            }

            if (!draftKey || !window.SupabaseService) return;
            var documents = await window.SupabaseService.getDocuments();
            activeDrafts = (documents || []).filter(function(doc) { return doc.isDraft && doc.draftKey === draftKey; });
            if (!activeDrafts.length) { localStorage.removeItem(draftStorageKey); return; }
            var draft = activeDrafts[0];
            document.getElementById('doc-upload-name').value = draft.name || '';
            document.getElementById('doc-upload-content').value = draft.desc || '';
            category.value = draft.type || 'Đơn mua';
            syncAttachments();
            if (draftButton) draftButton.textContent = 'Đã lưu nháp';
        };
        loadDraft();

        var saveDocument = async function(isDraft) {
            var name = (document.getElementById('doc-upload-name').value || '').trim();
            var content = (document.getElementById('doc-upload-content').value || '').trim();
            var pdfInput = document.getElementById('pdf-input');
            var pdfFile = pdfInput && pdfInput.files[0];
            var wordFile = docxInput && docxInput.files[0];
            var isLegalDocument = category.value === 'Văn bản luật';

            if (!isDraft && !name) { alert('Vui lòng nhập tên tài liệu.'); return; }
            var draftFiles = activeDrafts.filter(function(doc) { return !!doc.fileUrl; });
            var hasExistingFile = activeEditDoc && activeEditDoc.file && !activeEditDocFileDeleted;
            if (!isDraft && isLegalDocument && !pdfFile && !draftFiles.length && !hasExistingFile) { alert('Văn bản luật cần đính kèm một tệp PDF.'); return; }
            if (pdfFile && !/\.pdf$/i.test(pdfFile.name)) { alert('Tệp PDF phải có định dạng .pdf.'); return; }
            if ((pdfFile && pdfFile.size > 50 * 1024 * 1024) || (wordFile && wordFile.size > 50 * 1024 * 1024)) { alert('Tệp đính kèm vượt quá giới hạn 50 MB.'); return; }

            var button = isDraft ? draftButton : saveButton;
            var original = button.innerHTML;
            if (!draftKey) draftKey = 'doc-draft-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
            button.disabled = true;
            button.textContent = isDraft ? 'Đang lưu nháp...' : (editId ? 'Đang cập nhật...' : 'Đang lưu...');
            try {
                var files = [pdfFile, isLegalDocument ? null : wordFile].filter(Boolean);
                if (!isDraft && !files.length && !draftFiles.length && !hasExistingFile) throw new Error('Vui lòng chọn ít nhất một tệp đính kèm.');
                if (isDraft) {
                    await removeDrafts(false);
                    for (var i = 0; i < Math.max(files.length, 1); i++) {
                        var uploadFile = files[i];
                        var fileUrl = uploadFile ? await window.SupabaseService.uploadDocumentFile(uploadFile, isLegalDocument ? 'legal' : 'forms') : '';
                        if (uploadFile && !fileUrl) throw new Error('Không thể tải tệp đính kèm lên.');
                        var docType = uploadFile ? (/\.pdf$/i.test(uploadFile.name) ? 'PDF' : 'DOCX') : 'DRAFT';
                        var createdDraft = await window.SupabaseService.addDocument({ name: name || 'Bản nháp chưa đặt tên', type: category.value, desc: content, file: fileUrl, docType: docType, isDraft: true, draftKey: draftKey });
                        if (!createdDraft) throw new Error('Không thể lưu bản nháp.');
                    }
                    localStorage.setItem(draftStorageKey, draftKey);
                    var refreshed = await window.SupabaseService.getDocuments();
                    activeDrafts = (refreshed || []).filter(function(doc) { return doc.isDraft && doc.draftKey === draftKey; });
                    alert('Đã lưu bản nháp.');
                    return;
                }
                
                if (editId && activeEditDoc) {
                    var item = files[0];
                    var finalUrl = activeEditDoc.file;
                    var finalType = activeEditDoc.docType;
                    if (item) {
                        finalUrl = await window.SupabaseService.uploadDocumentFile(item, isLegalDocument ? 'legal' : 'forms');
                        if (!finalUrl) throw new Error('Không thể tải tệp đính kèm lên.');
                        finalType = (/\.pdf$/i.test(item.name) ? 'PDF' : 'DOCX');
                    }
                    var updated = await window.SupabaseService.updateDocument(editId, { name: name, type: category.value, desc: content, file: finalUrl, docType: finalType });
                    if (!updated) throw new Error('Không thể cập nhật tài liệu.');
                    alert('Đã cập nhật tài liệu thành công.');
                } else {
                    var finalFiles = files.length ? files : draftFiles.map(function(doc) { return { existingUrl: doc.fileUrl, docType: doc.docType }; });
                    for (var j = 0; j < finalFiles.length; j++) {
                        var item = finalFiles[j];
                        var finalUrl = item.existingUrl || await window.SupabaseService.uploadDocumentFile(item, isLegalDocument ? 'legal' : 'forms');
                        if (!finalUrl) throw new Error('Không thể tải tệp đính kèm lên.');
                        var finalType = item.docType || (/\.pdf$/i.test(item.name) ? 'PDF' : 'DOCX');
                        var created = await window.SupabaseService.addDocument({ name: finalFiles.length > 1 ? name + ' (' + finalType + ')' : name, type: category.value, desc: content, file: finalUrl, docType: finalType });
                        if (!created) throw new Error('Không thể lưu tài liệu.');
                    }
                    await removeDrafts(!files.length);
                    alert('Đã lưu tài liệu thành công.');
                }
                
                localStorage.removeItem('noxh_document_edit_id');
                window.location.hash = '#docs';
            } catch (err) {
                console.error('Document save error:', err);
                alert(isDraft ? 'Không thể lưu bản nháp. Vui lòng thử lại.' : (editId ? 'Không thể cập nhật tài liệu. Vui lòng thử lại.' : 'Không thể lưu tài liệu. Vui lòng thử lại.'));
            } finally {
                button.disabled = false;
                button.innerHTML = original;
            }
        };
        saveButton.onclick = function() { saveDocument(false); };
        if (draftButton) draftButton.onclick = function() { saveDocument(true); };
    }

    function setupDropzone(zoneId, inputId) {
        var dropzone = document.getElementById(zoneId);
        var input = document.getElementById(inputId);
        if (!dropzone || !input) return;

        var selectedFileLabel = document.getElementById(inputId.replace('-input', '-selected-file'));
        var showSelectedFile = function() {
            var file = input.files && input.files[0];
            if (!selectedFileLabel) return;
            if (!file) {
                selectedFileLabel.textContent = '';
                selectedFileLabel.classList.add('hidden');
                return;
            }
            var sizeInMb = file.size / (1024 * 1024);
            selectedFileLabel.textContent = 'Đã chọn: ' + file.name + ' (' + (sizeInMb < 1 ? Math.ceil(file.size / 1024) + ' KB' : sizeInMb.toFixed(1) + ' MB') + ')';
            selectedFileLabel.classList.remove('hidden');
        };

        // The transparent input already receives direct clicks. Only forward a
        // click from the visual part of the dropzone to avoid opening the file
        // picker twice.
        dropzone.addEventListener('click', function(event) {
            if (event.target !== input) input.click();
        });
        input.addEventListener('change', showSelectedFile);

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
            dropzone.addEventListener(eventName, function(e) {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(function(eventName) {
            dropzone.addEventListener(eventName, function() {
                dropzone.classList.add('upload-zone-hover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(function(eventName) {
            dropzone.addEventListener(eventName, function() {
                dropzone.classList.remove('upload-zone-hover');
            }, false);
        });

        dropzone.addEventListener('drop', function(e) {
            var dt = e.dataTransfer;
            if (dt && dt.files) {
                input.files = dt.files;
                showSelectedFile();
            }
        }, false);
    }

    // ---- User Management Module ---- //
    var usersList = [];

    var pendingUserSaveIndex = null;
    var pendingUserTempData = null;

    function removeAccents(str) {
        return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function escapeHtml(str) {
        return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function renderUserTable(filteredData) {
        var tbody = document.getElementById('user-table-tbody');
        if (!tbody) return;

        var dataToRender = filteredData || usersList;
        var html = '';

        var totalStat = document.getElementById('user-stat-total');
        if (totalStat) {
            totalStat.textContent = usersList.length.toLocaleString('vi-VN');
        }

        var activeStat = document.getElementById('user-stat-active');
        if (activeStat) {
            const now = new Date();
            const activeThresholdMs = 2 * 60 * 1000; // 2 minutes
            let activeCount = 0;
            usersList.forEach(u => {
                if (u.last_active_at) {
                    const lastActive = new Date(u.last_active_at);
                    if (now - lastActive < activeThresholdMs) {
                        activeCount++;
                    }
                }
            });
            activeStat.textContent = activeCount.toLocaleString('vi-VN');
        }

        var new30Stat = document.getElementById('user-stat-new30');
        if (new30Stat) {
            const now = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(now.getDate() - 30);
            let newUsersCount = 0;
            usersList.forEach(u => {
                const parts = u.date.split('/');
                if (parts.length === 3) {
                    const uDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                    if (uDate >= thirtyDaysAgo) {
                        newUsersCount++;
                    }
                }
            });
            new30Stat.textContent = newUsersCount.toLocaleString('vi-VN');
        }

        var pagInfo = document.getElementById('user-pagination-info');
        if (pagInfo) {
            pagInfo.textContent = 'Hiển thị 1 đến ' + dataToRender.length + ' của ' + usersList.length + ' mục';
        }

        if (dataToRender.length === 0) {
            html = '<tr><td colspan="5" class="p-8 text-center text-on-surface-variant font-medium">Không tìm thấy người dùng nào khớp với kết quả tìm kiếm</td></tr>';
        } else {
            dataToRender.forEach(function(user) {
                var realIndex = usersList.findIndex(function(u) { return u.id === user.id; });
                var isEditing = user.editing;

                html += '<tr class="hover:bg-surface-container-low transition-colors group" data-real-index="' + realIndex + '">';
                html += '<td class="p-4 border-b border-outline-variant text-center"><input type="checkbox" class="rounded border-outline-variant text-primary focus:ring-primary"></td>';

                if (isEditing) {
                    // Inline Editing Mode
                    html += '<td class="p-4 border-b border-outline-variant">';
                    html += '<div class="flex items-center gap-3">';
                    html += '<div class="w-10 h-10 rounded-full ' + user.avatarBg + ' flex items-center justify-center font-bold text-sm flex-shrink-0">' + user.avatarText + '</div>';
                    html += '<div class="flex-1">';
                    html += '<label class="text-[11px] text-primary font-semibold block mb-0.5">Tên người dùng:</label>';
                    html += '<input type="text" class="edit-input-name w-full px-2 py-1 border border-primary rounded text-sm bg-surface-container-lowest font-medium text-on-surface focus:outline-none shadow-sm" value="' + escapeHtml(user.name) + '" placeholder="Họ và tên">';
                    html += '<p class="text-xs text-on-surface-variant mt-1">ID: ' + user.id + '</p>';
                    html += '</div></div></td>';

                    html += '<td class="p-4 border-b border-outline-variant">';
                    html += '<div class="space-y-1.5">';
                    html += '<div><label class="text-[11px] text-on-surface-variant font-medium block">Email đăng nhập:</label>';
                    html += '<input type="email" class="w-full px-2 py-1 border border-outline-variant rounded text-sm bg-surface-container-low text-on-surface-variant" value="' + escapeHtml(user.email) + '" readonly title="Email do Supabase Auth quản lý"></div>';
                    html += '<div><label class="text-[11px] text-on-surface-variant font-medium block">Số điện thoại:</label>';
                    html += '<input type="text" class="edit-input-phone w-full px-2 py-1 border border-outline-variant rounded text-sm bg-surface-container-lowest text-on-surface focus:border-primary focus:outline-none" value="' + escapeHtml(user.phone) + '" placeholder="Số điện thoại"></div>';
                    html += '</div></td>';

                    html += '<td class="p-4 border-b border-outline-variant text-sm text-on-surface-variant">' + user.date + '</td>';

                    html += '<td class="p-4 border-b border-outline-variant text-right">';
                    html += '<div class="flex items-center justify-end gap-1">';
                    html += '<button class="btn-save-user p-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm flex items-center gap-1" title="Xác nhận lưu (Dấu tích)" data-index="' + realIndex + '"><span class="material-symbols-outlined text-[20px]">done</span><span class="text-xs font-semibold pr-1">Lưu</span></button>';
                    html += '<button class="btn-cancel-user p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="Hủy" data-index="' + realIndex + '"><span class="material-symbols-outlined text-[20px]">close</span></button>';
                    html += '</div></td>';
                } else {
                    // Normal Display Mode
                    html += '<td class="p-4 border-b border-outline-variant">';
                    html += '<div class="flex items-center gap-3">';
                    html += '<div class="w-10 h-10 rounded-full ' + user.avatarBg + ' flex items-center justify-center font-bold text-sm flex-shrink-0">' + user.avatarText + '</div>';
                    html += '<div>';
                    html += '<p class="text-sm font-medium text-on-surface">' + escapeHtml(user.name) + '</p>';
                    html += '<p class="text-xs text-on-surface-variant">ID: ' + user.id + '</p>';
                    html += '</div></div></td>';

                    html += '<td class="p-4 border-b border-outline-variant">';
                    html += '<p class="text-sm text-on-surface">' + escapeHtml(user.email) + '</p>';
                    html += '<p class="text-xs text-on-surface-variant">' + escapeHtml(user.phone) + '</p>';
                    html += '</td>';

                    html += '<td class="p-4 border-b border-outline-variant text-sm text-on-surface-variant">' + user.date + '</td>';

                    html += '<td class="p-4 border-b border-outline-variant text-right">';
                    html += '<div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">';
                    html += '<button class="btn-edit-user p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary-fixed rounded transition-colors" title="Chỉnh sửa" data-index="' + realIndex + '"><span class="material-symbols-outlined text-[20px]">edit</span></button>';
                    html += '</div></td>';
                }
                html += '</tr>';
            });
        }

        tbody.innerHTML = html;
        attachUserTableEvents();
    }

    function attachUserTableEvents() {
        document.querySelectorAll('.btn-edit-user').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var idx = parseInt(this.getAttribute('data-index'), 10);
                usersList[idx].editing = true;
                handleUserSearch();
            });
        });

        document.querySelectorAll('.btn-cancel-user').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var idx = parseInt(this.getAttribute('data-index'), 10);
                usersList[idx].editing = false;
                handleUserSearch();
            });
        });

        document.querySelectorAll('.btn-save-user').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var idx = parseInt(this.getAttribute('data-index'), 10);
                var row = this.closest('tr');

                var nameVal = row.querySelector('.edit-input-name').value.trim();
                var emailVal = usersList[idx].email;
                var phoneVal = row.querySelector('.edit-input-phone').value.trim();

                if (!nameVal || !emailVal) {
                        alert('Vui lòng nhập đầy đủ câu hỏi và câu trả lời!');
                    return;
                }

                pendingUserSaveIndex = idx;
                pendingUserTempData = { name: nameVal, email: emailVal, phone: phoneVal };

                var modal = document.getElementById('user-confirm-modal');
                if (modal) {
                    modal.classList.remove('hidden');
                }
            });
        });

    }

    function initUserModalEvents() {
        var modal = document.getElementById('user-confirm-modal');
        var btnContinue = document.getElementById('modal-btn-continue-edit');
        var btnSave = document.getElementById('modal-btn-save-info');

        if (btnContinue) {
            btnContinue.onclick = function() {
                if (modal) modal.classList.add('hidden');
                pendingUserSaveIndex = null;
                pendingUserTempData = null;
            };
        }

        if (btnSave) {
            btnSave.onclick = async function() {
                if (pendingUserSaveIndex !== null && pendingUserTempData) {
                    var u = usersList[pendingUserSaveIndex];
                    
                    var oldText = btnSave.textContent;
                    btnSave.textContent = 'Đang lưu...';
                    btnSave.disabled = true;

                    try {
                        await window.SupabaseService.updateUser(u.id, {
                            name: pendingUserTempData.name,
                            phone: pendingUserTempData.phone
                        });
                        
                        usersList = await window.SupabaseService.getUsers() || [];
                    } catch(err) {
                        console.error(err);
                        alert('Lưu thay đổi thất bại!');
                    } finally {
                        btnSave.textContent = oldText;
                        btnSave.disabled = false;
                    }
                }
                if (modal) modal.classList.add('hidden');
                pendingUserSaveIndex = null;
                pendingUserTempData = null;
                handleUserSearch();
            };
        }
    }

    function handleUserSearch() {
        var input = document.getElementById('user-search-input');
        var countSpan = document.getElementById('user-search-count');
        var query = input ? input.value.trim() : '';
        var normQuery = removeAccents(query);

        if (!normQuery) {
            if (countSpan) countSpan.textContent = '';
            renderUserTable(usersList);
            return;
        }

        var results = usersList.filter(function(u) {
            var normName = removeAccents(u.name);
            var normEmail = removeAccents(u.email);
            var normPhone = removeAccents(u.phone);

            return normName.indexOf(normQuery) !== -1 ||
                   normEmail.indexOf(normQuery) !== -1 ||
                   normPhone.indexOf(normQuery) !== -1;
        });

        if (countSpan) {
            countSpan.textContent = 'Tìm thấy ' + results.length + ' kết quả';
        }

        renderUserTable(results);
    }

    function exportUsersToXLSX() {
        if (!usersList || usersList.length === 0) {
                        alert('Vui lòng nhập đầy đủ câu hỏi và câu trả lời!');
            return;
        }

        var csvContent = '\uFEFF';
        csvContent += 'Mã ID,Họ và tên,Email,Số điện thoại,Ngày tham gia\n';

        usersList.forEach(function(u) {
            var row = [
                '"' + u.id.replace(/"/g, '""') + '"',
                '"' + u.name.replace(/"/g, '""') + '"',
                '"' + u.email.replace(/"/g, '""') + '"',
                '"' + u.phone.replace(/"/g, '""') + '"',
                '"' + u.date.replace(/"/g, '""') + '"'
            ];
            csvContent += row.join(',') + '\n';
        });

        var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'danh-sach-nguoi-dung.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function initUserModule() {
        var searchInput = document.getElementById('user-search-input');
        if (searchInput) {
            searchInput.oninput = handleUserSearch;
        }

        var exportBtn = document.getElementById('btn-export-xlsx');
        if (exportBtn) {
            exportBtn.onclick = exportUsersToXLSX;
        }

        initUserModalEvents();
        renderUserTable(usersList);
    }

    // ---- FAQ Toggle ---- //
    function initFaqToggles() {
        document.querySelectorAll('.faq-admin-header').forEach(function(header) {
            // Remove old listeners by cloning
            var newHeader = header.cloneNode(true);
            header.parentNode.replaceChild(newHeader, header);
            
            newHeader.addEventListener('click', function() {
                var item = this.closest('.faq-admin-item');
                if (item) {
                    item.classList.toggle('expanded');
                }
            });
        });
    }

    // ---- Projects Module ---- //
    var projectsList = [];

    var pendingDeleteProjectIndex = null;
    var holdTimer = null;
    var isEditingProjectSession = false;
    var currentEditingProjectIndex = null;

    function resetProjectNewForm() {
        var titleEl = document.getElementById('prj-form-header-title');
        var nameInp = document.getElementById('prj-input-name');
        var ownerInp = document.getElementById('prj-input-owner');
        var statusSel = document.getElementById('prj-select-status');
        var descTxt = document.getElementById('prj-textarea-desc');
        var addressInp = document.getElementById('prj-input-address');
        var mapsInp = document.getElementById('prj-input-maps-url');
        var mainImagePreview = document.getElementById('prj-main-image-preview');
        var locationMapPreview = document.getElementById('location-map-img-preview');
        var locationMapPlaceholder = document.getElementById('location-map-placeholder');
        var quickInputIds = ['prj-input-area', 'prj-input-scale', 'prj-input-handover', 'prj-input-estimated-price'];

        if (titleEl) titleEl.textContent = 'Thông tin chi tiết Dự án';
        if (nameInp) nameInp.value = '';
        if (ownerInp) ownerInp.value = '';
        if (statusSel) statusSel.value = 'Chờ xây dựng';
        if (descTxt) descTxt.value = '';
        if (addressInp) addressInp.value = '';
        if (mapsInp) mapsInp.value = '';
        quickInputIds.forEach(function(id) { var input = document.getElementById(id); if (input) input.value = ''; });
        if (mainImagePreview) mainImagePreview.src = 'https://placehold.co/600x400/e5eeff/004ac6?text=Ảnh+đại+diện';
        if (locationMapPreview) {
            locationMapPreview.src = '';
            locationMapPreview.classList.add('hidden');
        }
        if (locationMapPlaceholder) locationMapPlaceholder.classList.remove('hidden');
        document.querySelectorAll('#page-projects-new input[placeholder="Thêm tiện ích..."]').forEach(function(input) { input.value = ''; if (input.previousElementSibling) input.previousElementSibling.checked = false; });
        document.querySelectorAll('#project-status-notes > div').forEach(function(item) { var checkbox = item.querySelector('input[type="checkbox"]'); var note = item.querySelector('input[type="text"]'); if (checkbox) checkbox.checked = false; if (note) note.value = ''; });
        document.querySelectorAll('#gallery-container .gallery-item').forEach(function(item) { item.remove(); });
        var floorplansContainer = document.getElementById('floorplans-container'); if (floorplansContainer) { floorplansContainer.innerHTML = ''; floorplansContainer.appendChild(createRestoredFloorplanItem({ url: '', note: '' })); }

        isEditingProjectSession = false;
        currentEditingProjectIndex = null;
    }

    function getStatusPillClass(status) {
        if (status === 'Chờ xây dựng') return 'status-cho-xay-dung';
        if (status === 'Đang xây dựng') return 'status-dang-xay-dung';
        if (status === 'Sắp nhận hồ sơ') return 'status-sap-nhan-ho-so';
        if (status === 'Đang nhận đơn') return 'status-dang-nhan-don';
        if (status === 'Chờ bàn giao') return 'status-cho-ban-giao';
        return 'status-dang-xay-dung';
    }

    function isDraftProject(project) {
        return !!(project && project.details && project.details.isDraft);
    }

    function getProjectDisplayId(project) {
        var regularProjects = projectsList.filter(function(item) { return !isDraftProject(item); });
        var normalizedTitle = (project.name || '').trim().toLocaleLowerCase('vi-VN');
        var matchingRegular = regularProjects.find(function(item) { return (item.name || '').trim().toLocaleLowerCase('vi-VN') === normalizedTitle; });
        var baseIndex = matchingRegular ? regularProjects.indexOf(matchingRegular) + 1 : projectsList.indexOf(project) + 1;
        return 'PRJ' + baseIndex + (isDraftProject(project) ? '-DEMO' : '');
    }

    function createRestoredGalleryItem(url) {
        var item = document.createElement('div');
        item.className = 'gallery-item aspect-square bg-surface-container rounded-xl overflow-hidden relative group cursor-pointer border border-outline-variant hover:border-primary transition-all';
        item.dataset.existingUrl = url;
        item.setAttribute('onclick', 'triggerGalleryUpload(this, event)');
        item.innerHTML = '<input type="file" accept="image/*" class="hidden gallery-file-input" onchange="previewGalleryImage(this)"><img src="' + url + '" class="gallery-img-preview w-full h-full object-cover group-hover:opacity-75 transition-opacity"><div class="gallery-upload-overlay absolute inset-0 bg-inverse-surface/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span class="material-symbols-outlined text-white text-2xl">photo_camera</span><span class="text-[11px] text-white font-medium mt-1">Đổi ảnh</span></div><button type="button" onclick="removeGalleryItem(this, event)" class="btn-remove-gallery absolute top-2 right-2 w-7 h-7 bg-error text-white rounded-full flex items-center justify-center z-20" title="Xóa ảnh"><span class="material-symbols-outlined text-sm font-bold">close</span></button>';
        return item;
    }

    function createRestoredFloorplanItem(plan) {
        var item = document.createElement('div');
        item.className = 'floorplan-item p-4 border border-outline-variant rounded-xl bg-surface-container-low relative space-y-3';
        item.dataset.existingUrl = plan.url;
        var hasImage = !!plan.url;
        item.innerHTML = '<button type="button" class="btn-remove-floorplan absolute top-3 right-3 w-7 h-7 bg-error/10 hover:bg-error text-error hover:text-white rounded-full flex items-center justify-center z-10" title="Xóa mặt bằng"><span class="material-symbols-outlined text-sm font-bold">close</span></button><input type="file" accept="image/*" class="hidden floorplan-file-input"><div class="floorplan-upload-box border-2 border-dashed border-outline-variant rounded-xl p-6 text-center bg-surface-container-lowest cursor-pointer"><img src="' + (plan.url || '') + '" class="floorplan-img-preview w-full h-40 object-cover rounded-lg ' + (hasImage ? '' : 'hidden') + '"><div class="floorplan-placeholder-content ' + (hasImage ? 'hidden' : '') + '"><span class="material-symbols-outlined text-4xl text-primary">map</span><p class="text-xs text-on-surface font-semibold">Kéo thả hoặc click để tải ảnh mặt bằng</p></div></div><input type="text" value="' + (plan.note || '').replace(/"/g, '&quot;') + '" placeholder="Ghi chú thông tin mặt bằng..." class="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary">';
        return item;
    }

    function restoreProjectFormCollections(details) {
        var galleryContainer = document.getElementById('gallery-container'); var galleryAdd = document.getElementById('btn-add-gallery-box');
        if (galleryContainer && galleryAdd) { galleryContainer.querySelectorAll('.gallery-item').forEach(function(item) { item.remove(); }); (details.gallery || []).forEach(function(url) { galleryContainer.insertBefore(createRestoredGalleryItem(url), galleryAdd); }); }
        var floorplansContainer = document.getElementById('floorplans-container');
        if (floorplansContainer) { floorplansContainer.innerHTML = ''; (details.floorplans || []).forEach(function(plan) { floorplansContainer.appendChild(createRestoredFloorplanItem(plan)); }); }
        var amenities = details.amenities || [];
        document.querySelectorAll('#page-projects-new input[placeholder="Thêm tiện ích..."]').forEach(function(input, index) { if (amenities[index]) { input.value = amenities[index]; if (input.previousElementSibling) input.previousElementSibling.checked = true; } });
    }

    function openProjectEdit(idOrName) {
        var prj = null;
        var idx = -1;

        for (var i = 0; i < projectsList.length; i++) {
            if (projectsList[i].id === idOrName || projectsList[i].name === idOrName) {
                prj = projectsList[i];
                idx = i;
                break;
            }
        }

        if (!prj) {
            alert('Không tìm thấy dự án. Danh sách sẽ được tải lại.');
            window.location.hash = '#projects';
            return;
        }

        isEditingProjectSession = true;
        currentEditingProjectIndex = idx;

        var titleEl = document.getElementById('prj-form-header-title');
        var nameInp = document.getElementById('prj-input-name');
        var ownerInp = document.getElementById('prj-input-owner');
        var statusSel = document.getElementById('prj-select-status');
        var descTxt = document.getElementById('prj-textarea-desc');
        var addressInp = document.getElementById('prj-input-address');
        var mapsInp = document.getElementById('prj-input-maps-url');
        var mainImagePreview = document.getElementById('prj-main-image-preview');
        var locationMapPreview = document.getElementById('location-map-img-preview');
        var locationMapPlaceholder = document.getElementById('location-map-placeholder');
        var areaInp = document.getElementById('prj-input-area');
        var scaleInp = document.getElementById('prj-input-scale');
        var handoverInp = document.getElementById('prj-input-handover');
        var estimatedPriceInp = document.getElementById('prj-input-estimated-price');

        if (titleEl) titleEl.textContent = 'Chỉnh sửa Dự án: ' + prj.name;
        if (nameInp) nameInp.value = prj.name;
        if (ownerInp) ownerInp.value = prj.owner;
        if (statusSel) statusSel.value = prj.status;
        if (descTxt) descTxt.value = prj.desc || '';
        if (addressInp) addressInp.value = (prj.details && prj.details.address) || prj.location || '';
        if (mapsInp) mapsInp.value = (prj.details && prj.details.mapsUrl) || '';
        if (areaInp) areaInp.value = (prj.details && prj.details.area) || '';
        if (scaleInp) scaleInp.value = (prj.details && prj.details.scale) || '';
        if (handoverInp) handoverInp.value = (prj.details && prj.details.handover) || '';
        if (estimatedPriceInp) estimatedPriceInp.value = (prj.details && prj.details.estimatedPrice) || '';
        if (prj.details && Array.isArray(prj.details.statusTimeline)) {
            document.querySelectorAll('#project-status-notes > div').forEach(function(item, index) {
                var statusItem = prj.details.statusTimeline[index];
                if (!statusItem) return;
                var checkbox = item.querySelector('input[type="checkbox"]'); var note = item.querySelector('input[type="text"]');
                if (checkbox) checkbox.checked = !!statusItem.checked;
                if (note) note.value = statusItem.note || '';
            });
        }
        if (mainImagePreview && prj.imageUrl) mainImagePreview.src = prj.imageUrl;
        if (locationMapPreview && prj.details && prj.details.locationMapUrl) {
            locationMapPreview.src = prj.details.locationMapUrl;
            locationMapPreview.classList.remove('hidden');
            if (locationMapPlaceholder) locationMapPlaceholder.classList.add('hidden');
        }
        restoreProjectFormCollections(prj.details || {});

        navigateTo('projects-new');
    }

    window.openProjectEdit = openProjectEdit;

    function renderProjectsTable(items) {
        var tbody = document.getElementById('admin-projects-tbody');
        if (!tbody) return;

        if (!items || items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-on-surface-variant text-sm font-medium">Không tìm thấy dự án nào phù hợp.</td></tr>';
            return;
        }

        var html = '';
        items.forEach(function(prj) {
            var realIdx = projectsList.indexOf(prj);
            var shortId = getProjectDisplayId(prj);
            var isDraft = isDraftProject(prj);
            var displayStatus = isDraft ? 'Bản nháp' : prj.status;
            var pillClass = isDraft ? 'status-draft' : getStatusPillClass(prj.status);

            html += '<tr class="hover:bg-surface-container-low transition-colors group">' +
                '<td class="p-4 border-b border-outline-variant text-sm font-semibold text-on-surface whitespace-nowrap">' + shortId + '</td>' +
                '<td class="p-4 border-b border-outline-variant min-w-[360px]">' +
                    '<div class="flex items-center gap-3">' +
                        '<img src="' + (prj.imageUrl || 'https://placehold.co/300x200/e5eeff/004ac6?text=Ảnh+dự+án') + '" alt="' + prj.name + '" class="w-12 h-10 rounded object-cover flex-shrink-0">' +
                        '<span class="text-sm font-semibold text-on-surface line-clamp-1 cursor-pointer hover:text-primary hover:underline transition-colors btn-edit-title" data-project-id="' + prj.id + '">' + prj.name + '</span>' +
                    '</div>' +
                '</td>' +
                '<td class="p-4 border-b border-outline-variant text-sm text-on-surface-variant whitespace-nowrap">' + prj.location + '</td>' +
                '<td class="p-4 border-b border-outline-variant text-sm text-on-surface-variant whitespace-nowrap">' + prj.owner + '</td>' +
                '<td class="p-4 border-b border-outline-variant whitespace-nowrap min-w-[150px]">' +
                    '<span class="status-pill ' + pillClass + ' whitespace-nowrap">' + displayStatus + '</span>' +
                '</td>' +
                '<td class="p-4 border-b border-outline-variant text-right align-middle whitespace-nowrap">' +
                    '<div class="flex items-center justify-end gap-1">' +
                        '<button class="p-2 text-on-surface-variant hover:text-primary transition-colors btn-edit-project cursor-pointer" data-project-id="' + prj.id + '" title="Chỉnh sửa"><span class="material-symbols-outlined text-[20px]">edit</span></button>' +
                        '<button class="p-2 text-on-surface-variant hover:text-error transition-colors btn-delete-project cursor-pointer" data-project-id="' + prj.id + '" title="Xóa dự án"><span class="material-symbols-outlined text-[20px]">delete</span></button>' +
                    '</div>' +
                '</td>' +
            '</tr>';
        });

        tbody.innerHTML = html;

        // Attach Edit listeners to both edit button and project title
        tbody.querySelectorAll('.btn-edit-project, .btn-edit-title').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var prj = projectsList.find(function(item) { return item.id === this.getAttribute('data-project-id'); }, this);
                if (!prj) return;

                // Use the immutable Supabase ID, not the display name. Names may be duplicated.
                openProjectEdit(prj.id);
            });
        });

        // Attach Delete listeners
        tbody.querySelectorAll('.btn-delete-project').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var prj = projectsList.find(function(item) { return item.id === this.getAttribute('data-project-id'); }, this);
                if (!prj) return;

                pendingDeleteProjectIndex = projectsList.indexOf(prj);

                var modal = document.getElementById('delete-project-modal');
                var prjNameSpan = document.getElementById('delete-project-name');
                if (prjNameSpan) prjNameSpan.textContent = prj.name;
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                }
            });
        });
    }

    function handleProjectsFilterSearch() {
        var searchInput = document.getElementById('admin-project-search');
        var locSelect = document.getElementById('admin-project-filter-location');
        var statusSelect = document.getElementById('admin-project-filter-status');

        var query = searchInput ? removeAccents(searchInput.value.trim().toLowerCase()) : '';
        var locVal = locSelect ? locSelect.value.trim() : '';
        var statusVal = statusSelect ? statusSelect.value.trim() : '';

        var results = projectsList.filter(function(prj) {
            var matchSearch = true;
            if (query) {
                var normID = removeAccents(prj.id.toLowerCase());
                var normShortID = removeAccents(getProjectDisplayId(prj).toLowerCase());
                var normName = removeAccents(prj.name.toLowerCase());
                var normLoc = removeAccents(prj.location.toLowerCase());
                var normOwner = removeAccents(prj.owner.toLowerCase());
                matchSearch = normID.indexOf(query) !== -1 ||
                              normShortID.indexOf(query) !== -1 ||
                              normName.indexOf(query) !== -1 ||
                              normLoc.indexOf(query) !== -1 ||
                              normOwner.indexOf(query) !== -1;
            }

            var matchLoc = true;
            if (locVal) {
                matchLoc = (prj.location === locVal);
            }

            var matchStatus = true;
            if (statusVal) {
                matchStatus = (prj.status === statusVal);
            }

            return matchSearch && matchLoc && matchStatus;
        });

        renderProjectsTable(results);
    }

    function initDeleteHoldModal() {
        var modal = document.getElementById('delete-project-modal');
        var btnCancel = document.getElementById('btn-cancel-delete-project');
        var btnHold = document.getElementById('btn-hold-delete-project');
        var progressBar = document.getElementById('delete-hold-progress');
        var labelSpan = document.getElementById('delete-hold-label');

        function closeModal() {
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            resetHoldState();
            pendingDeleteProjectIndex = null;
        }

        function resetHoldState() {
            if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
            }
            if (progressBar) {
                progressBar.style.transition = 'width 0.2s ease';
                progressBar.style.width = '0%';
            }
            if (labelSpan) {
                labelSpan.textContent = 'Xóa (Giữ 5s)';
            }
        }

        function startHold(e) {
            if (e.type === 'touchstart') e.preventDefault();
            resetHoldState();

            if (progressBar) {
                progressBar.style.transition = 'width 5s linear';
                progressBar.style.width = '100%';
            }
            if (labelSpan) {
                labelSpan.textContent = 'Đang giữ...';
            }

            holdTimer = setTimeout(async function() {
                if (pendingDeleteProjectIndex !== null && projectsList[pendingDeleteProjectIndex]) {
                    try {
                        var pId = projectsList[pendingDeleteProjectIndex].id;
                        await window.SupabaseService.deleteProject(pId);
                        
                        // Reload from Supabase
                        projectsList = await window.SupabaseService.getProjects() || [];
                        closeModal();
                        handleProjectsFilterSearch();
                    } catch (err) {
                        console.error('Error deleting project:', err);
                        alert('Có lỗi xảy ra khi xóa dự án!');
                        closeModal();
                    }
                }
            }, 5000);
        }

        function stopHold() {
            if (holdTimer) {
                resetHoldState();
            }
        }

        if (btnCancel) {
            btnCancel.onclick = closeModal;
        }

        if (btnHold) {
            btnHold.onmousedown = startHold;
            btnHold.onmouseup = stopHold;
            btnHold.onmouseleave = stopHold;
            btnHold.ontouchstart = startHold;
            btnHold.ontouchend = stopHold;
            btnHold.ontouchcancel = stopHold;
        }
    }

    function initProjectsModule() {
        var searchInput = document.getElementById('admin-project-search');
        var locSelect = document.getElementById('admin-project-filter-location');
        var statusSelect = document.getElementById('admin-project-filter-status');
        var cancelBtn = document.getElementById('btn-cancel-project-form');
        var saveBtn = document.getElementById('btn-save-project-form');
        var draftBtn = document.getElementById('btn-save-project-draft');

        if (searchInput) searchInput.oninput = handleProjectsFilterSearch;
        if (locSelect) locSelect.onchange = handleProjectsFilterSearch;
        if (statusSelect) statusSelect.onchange = handleProjectsFilterSearch;

        if (cancelBtn) {
            cancelBtn.onclick = function(e) {
                e.preventDefault();
                resetProjectNewForm();
                navigateTo('projects');
            };
        }

        async function saveProject(isDraft) {
                var activeButton = isDraft ? draftBtn : saveBtn;
                if (!activeButton) return;
                var nameInp = document.getElementById('prj-input-name');
                var ownerInp = document.getElementById('prj-input-owner');
                var statusSel = document.getElementById('prj-select-status');
                var descTxt = document.getElementById('prj-textarea-desc');
                var addressInp = document.getElementById('prj-input-address');
                var mapsInp = document.getElementById('prj-input-maps-url');
                var areaInp = document.getElementById('prj-input-area');
                var scaleInp = document.getElementById('prj-input-scale');
                var handoverInp = document.getElementById('prj-input-handover');
                var estimatedPriceInp = document.getElementById('prj-input-estimated-price');

                var nameVal = nameInp ? nameInp.value.trim() : '';
                if (!nameVal) {
                    alert('Vui lòng nhập tên dự án!');
                    return;
                }

                var oversizedFile = Array.from(document.querySelectorAll('#page-projects-new input[type="file"]'))
                    .map(function(input) { return input.files && input.files[0]; })
                    .find(function(file) { return file && file.size > 50 * 1024 * 1024; });
                if (oversizedFile) {
                    alert('Ảnh "' + oversizedFile.name + '" vượt quá giới hạn 50 MB.');
                    return;
                }

                // Show loading state on button
                var originalText = activeButton.innerHTML;
                activeButton.innerHTML = '<span class="material-symbols-outlined animate-spin mr-2">progress_activity</span> Đang lưu...';
                activeButton.disabled = true;

                try {
                    var existingDetails = (currentEditingProjectIndex !== null && projectsList[currentEditingProjectIndex] && projectsList[currentEditingProjectIndex].details) || {};
                    var isPublishingDemo = !isDraft && !!existingDetails.isDraft;
                    var projectData = {
                        name: nameVal,
                        owner: ownerInp ? ownerInp.value.trim() : 'Chủ đầu tư mới',
                        status: statusSel ? statusSel.value : 'Chờ xây dựng',
                        location: addressInp && addressInp.value.trim() ? addressInp.value.trim() : 'Hà Nội',
                        desc: descTxt ? descTxt.value : '',
                        details: Object.assign({}, existingDetails, { desc: descTxt ? descTxt.value : '', address: addressInp ? addressInp.value.trim() : '', mapsUrl: mapsInp ? mapsInp.value.trim() : '', area: areaInp ? areaInp.value.trim() : '', scale: scaleInp ? scaleInp.value.trim() : '', handover: handoverInp ? handoverInp.value.trim() : '', estimatedPrice: estimatedPriceInp ? estimatedPriceInp.value.trim() : '', amenities: Array.from(document.querySelectorAll('#page-projects-new input[placeholder="Thêm tiện ích..."]')).filter(input => input.previousElementSibling && input.previousElementSibling.checked && input.value.trim()).map(input => input.value.trim()), statusTimeline: Array.from(document.querySelectorAll('#project-status-notes > div')).map(function(item) { return { label: item.querySelector('label span').textContent.trim(), checked: item.querySelector('input[type="checkbox"]').checked, note: item.querySelector('input[type="text"]').value.trim() }; }), isDraft: !!isDraft })
                    };

                    var savedProject;
                    if (currentEditingProjectIndex !== null && projectsList[currentEditingProjectIndex]) {
                        // Update
                        var pId = projectsList[currentEditingProjectIndex].id;
                        savedProject = await window.SupabaseService.updateProject(pId, projectData);
                    } else {
                        // Create
                        savedProject = await window.SupabaseService.addProject(projectData);
                    }

                    var projectId = (savedProject && savedProject.id) || (currentEditingProjectIndex !== null && projectsList[currentEditingProjectIndex] && projectsList[currentEditingProjectIndex].id);
                    if (!projectId) throw new Error('Không nhận được mã dự án sau khi lưu');
                    var mainFile = document.getElementById('prj-main-image-input').files[0];
                    var galleryItems = Array.from(document.querySelectorAll('#gallery-container .gallery-item'));
                    var floorplanItems = Array.from(document.querySelectorAll('#floorplans-container .floorplan-item'));
                    var mainImageUrl = mainFile ? await window.SupabaseService.uploadProjectImage(projectId, mainFile, 'main') : (existingDetails.mainImageUrl || '');
                    var gallery = (await Promise.all(galleryItems.map(async function(item) { var file = item.querySelector('.gallery-file-input').files[0]; return file ? await window.SupabaseService.uploadProjectImage(projectId, file, 'gallery') : (item.dataset.existingUrl || null); }))).filter(Boolean);
                    var floorplans = (await Promise.all(floorplanItems.map(async item => { var file = item.querySelector('.floorplan-file-input').files[0]; var url = file ? await window.SupabaseService.uploadProjectImage(projectId, file, 'floorplans') : item.dataset.existingUrl; return url ? { url: url, note: item.querySelector('input[type="text"]').value.trim() } : null; }))).filter(Boolean);
                    var mapFile = document.getElementById('location-map-file-input').files[0];
                    var locationMapUrl = mapFile ? await window.SupabaseService.uploadProjectImage(projectId, mapFile, 'location') : (existingDetails.locationMapUrl || '');
                    projectData.details = Object.assign(projectData.details, { mainImageUrl: mainImageUrl, gallery: gallery, floorplans: floorplans, locationMapUrl: locationMapUrl });
                    await window.SupabaseService.updateProject(projectId, projectData);

                    // Reload from Supabase
                    projectsList = await window.SupabaseService.getProjects() || [];
                    
                    resetProjectNewForm();
                    navigateTo('projects');
                    renderProjectsTable(projectsList);
                    alert(isDraft ? 'Đã lưu dự án dưới dạng bản nháp.' : (isPublishingDemo ? 'Đã xuất bản dự án DEMO. Hậu tố -DEMO đã được gỡ.' : 'Đã lưu dự án thành công.'));
                } catch (err) {
                    console.error('Error saving project:', err);
                    alert('Có lỗi xảy ra khi lưu dự án!');
                } finally {
                    activeButton.innerHTML = originalText;
                    activeButton.disabled = false;
                }
        }

        if (saveBtn) {
            saveBtn.onclick = function(e) {
                e.preventDefault();
                saveProject(false);
            };
        }

        if (draftBtn) {
            draftBtn.onclick = function(e) {
                e.preventDefault();
                saveProject(true);
            };
        }

        initDeleteHoldModal();
        initProjectFormInteractiveFeatures();
        renderProjectsTable(projectsList);
    }

    window.previewMainImage = function(input) {
        if (input.files && input.files[0]) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var prev = document.getElementById('prj-main-image-preview');
                if (prev) prev.src = e.target.result;
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

    window.previewNewsMainImage = function(input) {
        if (input.files && input.files[0]) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var prev = document.getElementById('news-main-image-preview');
                var placeholder = document.getElementById('news-image-placeholder');
                if (prev) {
                    prev.src = e.target.result;
                    prev.classList.remove('hidden');
                }
                if (placeholder) {
                    placeholder.classList.add('hidden');
                }
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

    window.triggerGalleryUpload = function(itemEl, e) {
        if (e && e.target.closest('.btn-remove-gallery')) return;
        var inp = itemEl.querySelector('.gallery-file-input');
        if (inp && e && e.target !== inp) {
            inp.click();
        }
    };

    window.previewGalleryImage = function(input) {
        if (input.files && input.files[0]) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var item = input.closest('.gallery-item');
                if (item) {
                    var img = item.querySelector('.gallery-img-preview');
                    if (img) img.src = e.target.result;
                }
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

    window.removeGalleryItem = function(btn, e) {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        var item = btn.closest('.gallery-item');
        if (item) item.remove();
    };

    window.addGalleryBox = function(e) {
        if (e) e.stopPropagation();
        var container = document.getElementById('gallery-container');
        var addBtn = document.getElementById('btn-add-gallery-box');
        if (!container || !addBtn) return;

        var newItem = document.createElement('div');
        newItem.className = 'gallery-item aspect-square bg-surface-container rounded-xl overflow-hidden relative group cursor-pointer border border-outline-variant hover:border-primary transition-all';
        newItem.setAttribute('onclick', 'triggerGalleryUpload(this, event)');
        newItem.innerHTML = '<input type="file" accept="image/*" class="hidden gallery-file-input" onchange="previewGalleryImage(this)">' +
            '<img src="https://placehold.co/300x300/e5eeff/004ac6?text=Ảnh+mới" class="gallery-img-preview w-full h-full object-cover group-hover:opacity-75 transition-opacity">' +
            '<div class="gallery-upload-overlay absolute inset-0 bg-inverse-surface/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">' +
                '<span class="material-symbols-outlined text-white text-2xl">photo_camera</span>' +
                '<span class="text-[11px] text-white font-medium mt-1">Đổi ảnh</span>' +
            '</div>' +
            '<button type="button" onclick="removeGalleryItem(this, event)" class="btn-remove-gallery absolute top-2 right-2 w-7 h-7 bg-error text-white rounded-full flex items-center justify-center hover:bg-error/90 transition-transform hover:scale-110 z-20" title="Xóa ảnh">' +
                '<span class="material-symbols-outlined text-sm font-bold">close</span>' +
            '</button>';

        container.insertBefore(newItem, addBtn);

        var inp = newItem.querySelector('.gallery-file-input');
        if (inp) inp.click();
    };

    function initProjectFormInteractiveFeatures() {
        // Location Map Upload Box
        var locBox = document.getElementById('location-map-upload-box');
        var locInput = document.getElementById('location-map-file-input');
        var locPreview = document.getElementById('location-map-img-preview');
        var locPlaceholder = document.getElementById('location-map-placeholder');

        if (locBox && locInput) {
            locBox.onclick = function() {
                locInput.click();
            };
            locInput.onchange = function() {
                if (this.files && this.files[0]) {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        if (locPreview) {
                            locPreview.src = e.target.result;
                            locPreview.classList.remove('hidden');
                        }
                        if (locPlaceholder) locPlaceholder.classList.add('hidden');
                    };
                    reader.readAsDataURL(this.files[0]);
                }
            };
        }

        // Floorplans Dynamic Add / Delete / Upload
        var floorplansContainer = document.getElementById('floorplans-container');
        var btnAddFloorplan = document.getElementById('btn-add-floorplan');

        function bindFloorplanItemEvents(item) {
            var fileInput = item.querySelector('.floorplan-file-input');
            var uploadBox = item.querySelector('.floorplan-upload-box');
            var imgPreview = item.querySelector('.floorplan-img-preview');
            var placeholder = item.querySelector('.floorplan-placeholder-content');
            var btnRemove = item.querySelector('.btn-remove-floorplan');

            if (uploadBox && fileInput) {
                uploadBox.onclick = function() {
                    fileInput.click();
                };
            }

            if (fileInput) {
                fileInput.onchange = function() {
                    if (this.files && this.files[0]) {
                        var reader = new FileReader();
                        reader.onload = function(e) {
                            if (imgPreview) {
                                imgPreview.src = e.target.result;
                                imgPreview.classList.remove('hidden');
                            }
                            if (placeholder) placeholder.classList.add('hidden');
                        };
                        reader.readAsDataURL(this.files[0]);
                    }
                };
            }

            if (btnRemove) {
                btnRemove.onclick = function(e) {
                    e.stopPropagation();
                    item.remove();
                };
            }
        }

        if (floorplansContainer) {
            floorplansContainer.querySelectorAll('.floorplan-item').forEach(bindFloorplanItemEvents);
        }

        if (btnAddFloorplan && floorplansContainer) {
            btnAddFloorplan.onclick = function() {
                var newItem = document.createElement('div');
                newItem.className = 'floorplan-item p-4 border border-outline-variant rounded-xl bg-surface-container-low relative space-y-3';
                newItem.innerHTML = '<button type="button" class="btn-remove-floorplan absolute top-3 right-3 w-7 h-7 bg-error/10 hover:bg-error text-error hover:text-white rounded-full flex items-center justify-center transition-all z-10" title="Xóa mặt bằng">' +
                    '<span class="material-symbols-outlined text-sm font-bold">close</span>' +
                '</button>' +
                '<input type="file" accept="image/*" class="hidden floorplan-file-input">' +
                '<div class="floorplan-upload-box border-2 border-dashed border-outline-variant rounded-xl p-6 text-center bg-surface-container-lowest hover:bg-surface-container hover:border-primary transition-all cursor-pointer relative group">' +
                    '<img src="" class="floorplan-img-preview w-full h-40 object-cover rounded-lg mb-2 hidden">' +
                    '<div class="floorplan-placeholder-content">' +
                        '<span class="material-symbols-outlined text-4xl text-primary mb-1">map</span>' +
                        '<p class="text-xs text-on-surface font-semibold">Kéo thả hoặc click để tải ảnh mặt bằng</p>' +
                        '<p class="text-[11px] text-on-surface-variant mt-0.5">PNG, JPG, tối đa 50MB</p>' +
                    '</div>' +
                '</div>' +
                '<input type="text" placeholder="Ghi chú thông tin mặt bằng (vd: Mặt bằng tổng thể Tòa A, căn hộ 2 phòng ngủ)..." class="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary">';

                floorplansContainer.appendChild(newItem);
                bindFloorplanItemEvents(newItem);

                var newFileInput = newItem.querySelector('.floorplan-file-input');
                if (newFileInput) newFileInput.click();
            };
        }
    }

    function initDocumentPackageUploads() {
        document.querySelectorAll('.package-upload-input').forEach(function(input) {
            input.onchange = async function() {
                var label = document.getElementById(this.getAttribute('data-label'));
                if (!label) return;

                var file = this.files && this.files[0];
                if (!file) { label.textContent = 'Chưa chọn tệp'; return; }
                if (!/\.zip$/i.test(file.name)) {
                    alert('Bộ tài liệu chỉ nhận tệp định dạng .zip.');
                    this.value = '';
                    label.textContent = 'Chưa chọn tệp .zip';
                    return;
                }
                if (file.size > 50 * 1024 * 1024) { alert('Tệp vượt quá giới hạn 50 MB.'); this.value = ''; return; }
                var category = this.getAttribute('data-category');
                label.textContent = 'Đang tải lên...';
                label.classList.add('text-primary', 'font-medium');
                try {
                    var url = await window.SupabaseService.uploadDocumentFile(file, 'packages');
                    if (!url) throw new Error('Không thể tải tệp lên.');
                    var ext = 'ZIP';
                    var record = await window.SupabaseService.addDocument({ name: file.name, type: category, desc: '', file: url, docType: ext });
                    if (!record) throw new Error('Không thể lưu dữ liệu tài liệu.');
                    label.textContent = 'Đã tải lên: ' + file.name;
                } catch (error) {
                    console.error('Package upload error:', error);
                    label.textContent = 'Tải lên thất bại. Vui lòng thử lại.';
                    label.classList.remove('text-primary');
                }
            };
        });
    }

    function initDocsFilter() {
        var btn = document.getElementById('docs-filter-btn');
        var menu = document.getElementById('docs-filter-menu');
        var arrow = document.getElementById('docs-filter-arrow');
        var label = document.getElementById('docs-filter-label');
        var options = document.querySelectorAll('.docs-filter-option');
        var searchInput = document.querySelector('#page-docs input[type="text"]');

        if (!btn || !menu) return;

        btn.onclick = function(e) {
            e.stopPropagation();
            var isHidden = menu.classList.contains('hidden');
            if (isHidden) {
                menu.classList.remove('hidden');
                menu.classList.add('flex');
                if (arrow) arrow.style.transform = 'rotate(180deg)';
            } else {
                menu.classList.add('hidden');
                menu.classList.remove('flex');
                if (arrow) arrow.style.transform = 'rotate(0deg)';
            }
        };

        document.onclick = function(e) {
            if (!menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
                menu.classList.add('hidden');
                menu.classList.remove('flex');
                if (arrow) arrow.style.transform = 'rotate(0deg)';
            }
        };

        options.forEach(function(opt) {
            opt.onclick = function(e) {
                e.stopPropagation();
                var val = this.getAttribute('data-value');
                
                options.forEach(function(o) {
                    o.classList.remove('active');
                    var chk = o.querySelector('.check-icon');
                    if (chk) chk.classList.add('hidden');
                });
                this.classList.add('active');
                var check = this.querySelector('.check-icon');
                if (check) check.classList.remove('hidden');

                if (label) {
                    label.textContent = val === 'all' ? 'Lọc: Tất cả' : 'Lọc: ' + val;
                }

                menu.classList.add('hidden');
                menu.classList.remove('flex');
                if (arrow) arrow.style.transform = 'rotate(0deg)';

                filterDocsTable();
            };
        });

        function filterDocsTable() {
            var docRows = document.querySelectorAll('#page-docs tbody tr[data-document-row]');
            var activeOpt = document.querySelector('.docs-filter-option.active');
            var selectedVal = activeOpt ? activeOpt.getAttribute('data-value') : 'all';
            var query = searchInput ? searchInput.value.toLowerCase().trim() : '';

            docRows.forEach(function(row) {
                var docTypeCell = row.children[1]; // Column 2 is Loại đơn
                var docTypeText = docTypeCell ? docTypeCell.textContent.trim() : '';
                var rowText = row.textContent.toLowerCase();

                var matchesType = (selectedVal === 'all' || docTypeText.includes(selectedVal));
                var matchesSearch = (!query || rowText.includes(query));

                if (matchesType && matchesSearch) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }

        if (searchInput) {
            searchInput.oninput = filterDocsTable;
        }
    }

    async function renderAdminDocuments() {
        var tbody = document.querySelector('#page-docs tbody');
        if (!tbody || !window.SupabaseService) return;
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-on-surface-variant text-sm">Đang tải tài liệu...</td></tr>';
        var documents = await window.SupabaseService.getDocuments();
        if (!documents || !documents.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-on-surface-variant text-sm">Không có tài liệu nào</td></tr>';
            return;
        }
        tbody.innerHTML = documents.map(function(doc) {
            return '<tr data-document-row class="border-b border-outline-variant/50 hover:bg-surface-container-lowest transition-colors">' +
                '<td class="p-4 font-medium text-on-surface align-middle"><a href="javascript:void(0)" data-document-id="' + doc.id + '" class="btn-edit-document hover:text-primary transition-colors">' + escapeHtml(doc.name) + '</a>' + (doc.isDraft ? ' <span class="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 align-middle">Bản nháp</span>' : '') + '</td>' +
                '<td class="p-4 text-on-surface-variant align-middle text-center">' + escapeHtml(doc.type || '') + '</td>' +
                '<td class="p-4 text-on-surface-variant align-middle text-center">' + escapeHtml(doc.docType || 'PDF') + '</td>' +
                '<td class="p-4 text-on-surface-variant align-middle text-center">' + escapeHtml(doc.date || '') + '</td>' +
                '<td class="p-4 text-center align-middle">' + 
                '<div class="flex justify-center items-center gap-1">' +
                (doc.isDraft ? '<button type="button" data-draft-key="' + escapeHtml(doc.draftKey || '') + '" class="btn-open-document-draft text-primary hover:bg-primary/10 p-2 rounded-lg" title="Mở bản nháp"><span class="material-symbols-outlined">edit</span></button>' : 
                '<button type="button" data-document-id="' + doc.id + '" class="btn-edit-document text-primary hover:bg-primary/10 p-2 rounded-lg" title="Sửa"><span class="material-symbols-outlined">edit</span></button>') + 
                '<button type="button" data-document-id="' + doc.id + '" data-draft-key="' + escapeHtml(doc.draftKey || '') + '" class="btn-delete-document text-error hover:bg-error/10 p-2 rounded-lg" title="Xóa tài liệu"><span class="material-symbols-outlined">delete</span></button>' +
                '</div></td>' +
            '</tr>';
        }).join('');
        initDocsFilter();
        tbody.querySelectorAll('.btn-open-document-draft').forEach(function(button) {
            button.onclick = function() {
                localStorage.setItem('noxh_document_draft_key', button.getAttribute('data-draft-key'));
                window.location.hash = '#docs-new';
            };
        });
        tbody.querySelectorAll('.btn-edit-document').forEach(function(el) {
            el.onclick = function() {
                localStorage.setItem('noxh_document_edit_id', el.getAttribute('data-document-id'));
                window.location.hash = '#docs-new';
            };
        });
        tbody.querySelectorAll('.btn-delete-document').forEach(function(button) {
            button.onclick = async function() {
                if (!confirm('Xóa tài liệu này khỏi Supabase và Storage?')) return;
                button.disabled = true;
                var draftKey = button.getAttribute('data-draft-key');
                var success = true;
                if (draftKey) {
                    var allDocuments = await window.SupabaseService.getDocuments();
                    var drafts = (allDocuments || []).filter(function(doc) { return doc.isDraft && doc.draftKey === draftKey; });
                    for (var i = 0; i < drafts.length; i++) {
                        if (!await window.SupabaseService.deleteDocument(drafts[i].id)) success = false;
                    }
                } else {
                    success = await window.SupabaseService.deleteDocument(button.getAttribute('data-document-id'));
                }
                if (!success) alert('Không thể xóa tài liệu. Vui lòng kiểm tra quyền Storage và thử lại.');
                await renderAdminDocuments();
            };
        });
    }

                    var faqData = {};

    var currentFaqCategory = 'doi-tuong';
    var pendingDeleteFaqIndex = null;
    var draggedFaqIndex = null;

    function initFaqModule() {
        var catBtns = document.querySelectorAll('.faq-cat-btn');
        var container = document.getElementById('faq-admin-list');
        var btnAddFaq = document.getElementById('btn-add-faq-item');
        var modal = document.getElementById('faq-delete-modal');
        var btnConfirmDelete = document.getElementById('btn-confirm-delete-faq');
        var btnCancelDelete = document.getElementById('btn-cancel-delete-faq');
        var searchInput = document.getElementById('faq-admin-search-input');
        var searchClear = document.getElementById('faq-admin-search-clear');

        if (!container) return;

        // Switch category tabs
        catBtns.forEach(function(btn) {
            btn.onclick = function() {
                catBtns.forEach(function(b) {
                    b.className = 'faq-cat-btn px-4 py-2 rounded-full text-sm font-medium bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer';
                });
                this.className = 'faq-cat-btn px-4 py-2 rounded-full text-sm font-medium bg-primary text-on-primary shadow-xs transition-colors cursor-pointer active';
                currentFaqCategory = this.getAttribute('data-cat');
                renderFaqList();
            };
        });

        // Search Input Listeners (Request 1)
        if (searchInput) {
            searchInput.oninput = function() {
                var query = this.value.trim();
                if (searchClear) {
                    if (query) searchClear.classList.remove('hidden');
                    else searchClear.classList.add('hidden');
                }
                renderFaqList();
            };
        }

        if (searchClear) {
            searchClear.onclick = function() {
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                }
                searchClear.classList.add('hidden');
                renderFaqList();
            };
        }

        // Delete Modal Handlers
        if (btnCancelDelete) {
            btnCancelDelete.onclick = function() {
                if (modal) {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                }
                pendingDeleteFaqIndex = null;
            };
        }

        if (btnConfirmDelete) {
            btnConfirmDelete.onclick = async function() {
                if (pendingDeleteFaqIndex !== null && faqData[currentFaqCategory]) {
                    try {
                        var faqId = faqData[currentFaqCategory][pendingDeleteFaqIndex].id;
                        await window.SupabaseService.deleteFaq(faqId);
                        faqData[currentFaqCategory].splice(pendingDeleteFaqIndex, 1);
                        pendingDeleteFaqIndex = null;
                        if (modal) {
                            modal.classList.add('hidden');
                            modal.classList.remove('flex');
                        }
                        renderFaqList();
                    } catch (err) {
                        console.error('Error deleting FAQ:', err);
                        alert('Có lỗi khi xóa FAQ!');
                    }
                }
            };
        }

        // Add New FAQ Item AT THE BOTTOM (Request 3)
        if (btnAddFaq) {
            btnAddFaq.onclick = function() {
                var newCard = document.createElement('div');
                newCard.className = 'faq-admin-item p-5 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xs space-y-4';
                newCard.innerHTML = '<div class="font-semibold text-sm text-primary flex items-center gap-2"><span class="material-symbols-outlined text-base">add_circle</span> Th&#7875;m FAQ m&#7899;i</div>' +
                    '<div><label class="block text-xs font-semibold text-on-surface-variant mb-1">C&#226;u h&#7887;i:</label>' +
                    '<input type="text" class="faq-edit-q w-full font-semibold px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary" placeholder="Nh&#7853;p c&#226;u h&#7887;i FAQ..."></div>' +
                    '<div><label class="block text-xs font-semibold text-on-surface-variant mb-1">C&#226;u tr&#7843; l&#7901;i:</label>' +
                    '<textarea class="faq-edit-a w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary" rows="4" placeholder="Nh&#7853;p c&#226;u tr&#7843; l&#7901;i chi ti&#7871;t..."></textarea></div>' +
                    '<div class="flex items-center gap-3 pt-1">' +
                        '<button type="button" class="btn-save-new-faq px-5 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-surface-tint transition-colors cursor-pointer shadow-xs">L&#432;u FAQ</button>' +
                        '<button type="button" class="btn-cancel-new-faq px-5 py-2 bg-surface-container-low border border-outline-variant text-on-surface-variant text-xs font-semibold rounded-xl hover:bg-surface-container transition-colors cursor-pointer">H&#7907;i</button>' +
                    '</div>';

                // APPEND AT THE BOTTOM
                container.appendChild(newCard);
                newCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                var qInput = newCard.querySelector('.faq-edit-q');
                if (qInput) qInput.focus();

                newCard.querySelector('.btn-save-new-faq').onclick = async function() {
                    var qVal = newCard.querySelector('.faq-edit-q').value.trim();
                    var aVal = newCard.querySelector('.faq-edit-a').value.trim();
                    if (!qVal || !aVal) {
                        alert('Vui lòng nhập đầy đủ câu hỏi và câu trả lời!');
                        return;
                    }

                    var saveBtn = newCard.querySelector('.btn-save-new-faq');
                    var oldText = saveBtn.innerHTML;
                    saveBtn.innerHTML = 'Đang lưu...';
                    saveBtn.disabled = true;

                    try {
                        var faqPayload = { question: qVal, answer: aVal, category: currentFaqCategory };
                        // Supabase does not have an addFaq function? Let's add it via API! 
                        // Wait, did I add addFaq to supabase-service? No, I only added updateFaq and getFaqs.
                        // I will add addFaq to supabase-service.js shortly. For now, call addFaq.
                        var newFaq = await window.SupabaseService.addFaq(faqPayload);
                        if (!faqData[currentFaqCategory]) faqData[currentFaqCategory] = [];
                        if (newFaq) {
                            faqData[currentFaqCategory].push({ id: newFaq.id, q: newFaq.question, a: newFaq.answer });
                        }
                        renderFaqList();
                    } catch (err) {
                        console.error('Error adding FAQ:', err);
                        alert('Có lỗi khi thêm FAQ!');
                    } finally {
                        saveBtn.innerHTML = oldText;
                        saveBtn.disabled = false;
                    }
                };

                newCard.querySelector('.btn-cancel-new-faq').onclick = function() {
                    newCard.remove();
                };
            };
        }

        renderFaqList();
    }

    function renderFaqList() {
        var container = document.getElementById('faq-admin-list');
        var searchInput = document.getElementById('faq-admin-search-input');
        var countEl = document.getElementById('faq-search-count');
        if (!container) return;

        var list = faqData[currentFaqCategory] || [];
        var query = searchInput ? removeAccents(searchInput.value.toLowerCase().trim()) : '';

        // Filter list if query exists (Request 1)
        var filteredList = list.filter(function(item) {
            if (!query) return true;
            var normQ = removeAccents(item.q.toLowerCase());
            var normA = removeAccents(item.a.toLowerCase());
            return normQ.indexOf(query) !== -1 || normA.indexOf(query) !== -1;
        });

        // Update search count status label
        if (countEl) {
            if (query) {
                countEl.classList.remove('hidden');
                countEl.textContent = 'Tìm thấy ' + filteredList.length + ' câu hỏi phù hợp với từ khóa "' + searchInput.value.trim() + '"';
            } else {
                countEl.classList.add('hidden');
            }
        }

        container.innerHTML = '';

        if (filteredList.length === 0) {
            if (query) {
                container.innerHTML = '<div class="p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-2xl text-on-surface-variant text-sm">Không tìm thấy câu hỏi nào phù hợp với từ khóa "' + searchInput.value.trim() + '".</div>';
            } else {
                container.innerHTML = '<div class="p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-2xl text-on-surface-variant text-sm">Chưa có câu hỏi FAQ nào trong mục này. Nhấp "+ Thêm FAQ mới" để thêm.</div>';
            }
            return;
        }

        filteredList.forEach(function(item, idx) {
            var realIdx = list.indexOf(item);
            var itemEl = document.createElement('div');
            itemEl.className = 'faq-admin-item bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xs overflow-hidden transition-all duration-200';
            itemEl.setAttribute('draggable', 'true');
            itemEl.setAttribute('data-index', realIdx);

            // Full Header Hitbox (User Request 2): Entire header row is clickable!
            itemEl.innerHTML = '<div class="faq-admin-header flex items-center justify-between p-4 sm:px-5 sm:py-4.5 cursor-pointer hover:bg-surface-container-low/40 transition-colors select-none">' +
                '<div class="flex items-center gap-3 flex-1 faq-toggle-area">' +
                    '<span class="material-symbols-outlined faq-drag-handle text-on-surface-variant/50 hover:text-primary transition-colors cursor-grab text-[22px] flex-shrink-0" title="K&#233;o th&#7843; &#273;&#7875; di chuy&#7875;n">drag_indicator</span>' +
                    '<span class="material-symbols-outlined faq-expand-icon text-on-surface-variant transition-transform duration-200 text-[20px] flex-shrink-0">keyboard_arrow_down</span>' +
                    '<h3 class="font-semibold text-sm sm:text-base text-on-surface faq-q-text leading-snug">' + item.q + '</h3>' +
                '</div>' +
                '<div class="flex items-center gap-1.5 flex-shrink-0 ml-3">' +
                    '<button type="button" class="btn-edit-faq p-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer rounded-lg hover:bg-surface-container-low" title="Ch&#7875;nh s&#7915;a"><span class="material-symbols-outlined text-[20px]">edit</span></button>' +
                    '<button type="button" class="btn-delete-faq p-2 text-on-surface-variant hover:text-error transition-colors cursor-pointer rounded-lg hover:bg-surface-container-low" title="X&#243;a"><span class="material-symbols-outlined text-[20px]">delete</span></button>' +
                '</div>' +
            '</div>' +
            '<div class="faq-admin-body hidden border-t border-outline-variant/60 bg-surface-container-lowest p-5 sm:px-6 sm:py-5 text-sm text-on-surface-variant leading-relaxed">' +
                '<p class="faq-a-text whitespace-pre-line">' + item.a + '</p>' +
            '</div>';

            // Drag and Drop
            itemEl.addEventListener('dragstart', function(e) {
                draggedFaqIndex = realIdx;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', realIdx);
                setTimeout(function() {
                    itemEl.classList.add('opacity-40', 'border-primary', 'border-dashed');
                }, 0);
            });

            itemEl.addEventListener('dragend', function() {
                itemEl.classList.remove('opacity-40', 'border-primary', 'border-dashed');
                document.querySelectorAll('.faq-admin-item').forEach(function(el) {
                    el.classList.remove('border-t-2', 'border-primary');
                });
            });

            itemEl.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                itemEl.classList.add('border-t-2', 'border-primary');
            });

            itemEl.addEventListener('dragleave', function() {
                itemEl.classList.remove('border-t-2', 'border-primary');
            });

            itemEl.addEventListener('drop', function(e) {
                e.preventDefault();
                itemEl.classList.remove('border-t-2', 'border-primary');
                var srcIdx = draggedFaqIndex;
                var targetIdx = realIdx;

                if (srcIdx !== null && srcIdx !== targetIdx && faqData[currentFaqCategory]) {
                    var movedItem = faqData[currentFaqCategory].splice(srcIdx, 1)[0];
                    faqData[currentFaqCategory].splice(targetIdx, 0, movedItem);
                    draggedFaqIndex = null;
                    renderFaqList();
                }
            });

            // ENTIRE HEADER HITBOX TOGGLE (Request 2): Click anywhere on header toggles accordion!
            var headerEl = itemEl.querySelector('.faq-admin-header');
            var bodyEl = itemEl.querySelector('.faq-admin-body');
            var arrowEl = itemEl.querySelector('.faq-expand-icon');

            headerEl.onclick = function(e) {
                // If user clicks edit button, delete button, or drag handle, don't toggle open/close
                if (e.target.closest('.btn-edit-faq') || e.target.closest('.btn-delete-faq') || e.target.closest('.faq-drag-handle')) {
                    return;
                }

                var isHidden = bodyEl.classList.contains('hidden');
                if (isHidden) {
                    bodyEl.classList.remove('hidden');
                    itemEl.classList.add('expanded');
                    arrowEl.style.transform = 'rotate(180deg)';
                } else {
                    bodyEl.classList.add('hidden');
                    itemEl.classList.remove('expanded');
                    arrowEl.style.transform = 'rotate(0deg)';
                }
            };

            // Expand automatically if user is actively searching!
            if (query) {
                bodyEl.classList.remove('hidden');
                itemEl.classList.add('expanded');
                arrowEl.style.transform = 'rotate(180deg)';
            }

            // Edit Item Handler
            var btnEdit = itemEl.querySelector('.btn-edit-faq');
            btnEdit.onclick = function(e) {
                e.stopPropagation();
                
                var editBox = document.createElement('div');
                editBox.className = 'faq-admin-item p-5 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xs space-y-4';
                editBox.innerHTML = '<div class="font-semibold text-sm text-primary flex items-center gap-2"><span class="material-symbols-outlined text-base">edit</span> Ch&#7875;nh s&#7915;a FAQ</div>' +
                    '<div><label class="block text-xs font-semibold text-on-surface-variant mb-1">C&#226;u h&#7887;i:</label>' +
                    '<input type="text" class="faq-edit-q w-full font-semibold px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary" value="' + item.q.replace(/"/g, '&quot;') + '"></div>' +
                    '<div><label class="block text-xs font-semibold text-on-surface-variant mb-1">C&#226;u tr&#7843; l&#7901;i:</label>' +
                    '<textarea class="faq-edit-a w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary" rows="4">' + item.a.replace(/\\n/g, '\n') + '</textarea></div>' +
                    '<div class="flex items-center gap-3 pt-1">' +
                        '<button type="button" class="btn-save-edit-faq px-5 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-surface-tint transition-colors cursor-pointer shadow-xs">C&#7853;p nh&#7853;t</button>' +
                        '<button type="button" class="btn-cancel-edit-faq px-5 py-2 bg-surface-container-low border border-outline-variant text-on-surface-variant text-xs font-semibold rounded-xl hover:bg-surface-container transition-colors cursor-pointer">H&#7907;i</button>' +
                    '</div>';

                container.replaceChild(editBox, itemEl);

                editBox.querySelector('.btn-save-edit-faq').onclick = async function() {
                    var newQ = editBox.querySelector('.faq-edit-q').value.trim();
                    var newA = editBox.querySelector('.faq-edit-a').value.trim();
                    if (!newQ || !newA) {
                        alert('Vui lòng nhập đầy đủ câu hỏi và câu trả lời!');
                        return;
                    }

                    var saveBtn = editBox.querySelector('.btn-save-edit-faq');
                    var oldText = saveBtn.innerHTML;
                    saveBtn.innerHTML = 'Đang lưu...';
                    saveBtn.disabled = true;

                    try {
                        var faqId = item.id; // From faqData
                        var faqPayload = { question: newQ, answer: newA, category: currentFaqCategory };
                        
                        await window.SupabaseService.updateFaq(faqId, faqPayload);
                        faqData[currentFaqCategory][realIdx] = { id: faqId, q: newQ, a: newA };
                        
                        renderFaqList();
                    } catch (err) {
                        console.error('Error updating FAQ:', err);
                        alert('Có lỗi khi cập nhật FAQ!');
                    } finally {
                        saveBtn.innerHTML = oldText;
                        saveBtn.disabled = false;
                    }
                };

                editBox.querySelector('.btn-cancel-edit-faq').onclick = function() {
                    renderFaqList();
                };
            };

            // Delete Item Handler
            var btnDelete = itemEl.querySelector('.btn-delete-faq');
            btnDelete.onclick = function(e) {
                e.stopPropagation();
                pendingDeleteFaqIndex = realIdx;
                var modal = document.getElementById('faq-delete-modal');
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                }
            };

            container.appendChild(itemEl);
        });
    }

    // ---- Docs Guide Module ---- //
    var guidesList = [];
    var isAutomaticGuideDocument = function(doc) {
        return doc && !doc.isDraft && (doc.type === 'Đơn mua' || doc.type === 'Đơn thuê');
    };
    var isGuideDocument = function(doc) {
        return doc && !doc.isDraft && (doc.type === 'Hướng dẫn' || isAutomaticGuideDocument(doc));
    };

    window.openGuideForm = function() {
        var listEl = document.getElementById('docs-guide-list-view');
        var formEl = document.getElementById('docs-guide-form-view');
        if (listEl && formEl) {
            listEl.classList.add('hidden');
            formEl.classList.remove('hidden');
        }
    };

    window.closeGuideForm = function() {
        var listEl = document.getElementById('docs-guide-list-view');
        var formEl = document.getElementById('docs-guide-form-view');
        if (listEl && formEl) {
            listEl.classList.remove('hidden');
            formEl.classList.add('hidden');
            renderGuideList();
        }
    };

    window.saveGuideForm = async function(status) {
        var nameInput = document.getElementById('guide-form-name');
        if (!nameInput) return;
        var name = nameInput.value.trim();
        if (!name) {
            alert('Vui lòng nhập tên tài liệu!');
            return;
        }

        try {
            var docData = {
                name: name,
                type: 'Hướng dẫn',
                status: status,
                desc: ''
            };
            
            await window.SupabaseService.addDocument(docData);
            guidesList = (await window.SupabaseService.getDocuments() || []).filter(isGuideDocument);
            
            // Reset form
            nameInput.value = '';
            var stepsContainer = document.getElementById('guide-steps-container');
            if (stepsContainer) stepsContainer.innerHTML = '';
            if (typeof window.addGuideStep === 'function') window.addGuideStep(); 
            
            var notesContainer = document.getElementById('guide-notes-container');
            if (notesContainer) notesContainer.innerHTML = '';
            if (typeof window.addGuideNote === 'function') window.addGuideNote();
            
            window.closeGuideForm();
        } catch (err) {
            console.error('Lỗi khi lưu tài liệu:', err);
            alert('Có lỗi xảy ra khi lưu tài liệu!');
        }
    };

    window.editGuide = function(id) {
        var guide = guidesList.find(function(g) { return g.id === id; });
        if (guide) {
            var nameInput = document.getElementById('guide-form-name');
            if (nameInput) nameInput.value = guide.name;
            window.openGuideForm();
        }
    };

    var pendingDeleteGuideId = null;

    window.deleteGuide = function(id) {
        pendingDeleteGuideId = id;
        var modal = document.getElementById('docs-guide-delete-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    window.closeDocsGuideDeleteModal = function() {
        pendingDeleteGuideId = null;
        var modal = document.getElementById('docs-guide-delete-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    window.confirmDocsGuideDelete = async function() {
        if (pendingDeleteGuideId !== null) {
            try {
                await window.SupabaseService.deleteDocument(pendingDeleteGuideId);
                guidesList = (await window.SupabaseService.getDocuments() || []).filter(isGuideDocument);
                renderGuideList();
                window.closeDocsGuideDeleteModal();
            } catch (err) {
                console.error(err);
                alert('Có lỗi khi xóa tài liệu!');
            }
        }
    };

    function renderGuideList() {
        var container = document.getElementById('docs-guide-list-container');
        if (!container) return;

        container.innerHTML = '';
        if (guidesList.length === 0) {
            container.innerHTML = '<div class="col-span-full p-8 text-center text-on-surface-variant font-medium bg-surface-container-lowest border border-outline-variant rounded-xl">Chưa có hướng dẫn nào được tạo.</div>';
            return;
        }

        guidesList.forEach(function(guide) {
            var isDraft = guide.status === 'draft';
            var isAutomatic = isAutomaticGuideDocument(guide);
            var badgeHtml = isDraft ? '<span class="px-2 py-0.5 bg-surface-variant text-on-surface-variant text-[11px] font-bold rounded-full">Nháp</span>' : '';
            var bgClass = isDraft ? 'bg-surface-container-lowest/50' : 'bg-surface-container-lowest';
            var cardHtml = 
                '<div class="' + bgClass + ' border border-outline-variant rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary transition-all group flex gap-4 items-start min-h-[100px]">' +
                    '<div class="w-10 h-10 mt-0.5 shrink-0 rounded-full bg-primary text-white flex items-center justify-center">' +
                        '<span class="material-symbols-outlined text-[20px]">menu_book</span>' +
                    '</div>' +
                    '<div class="flex-1 min-w-0 flex flex-col">' +
                        '<h3 class="font-semibold text-[15px] text-on-surface line-clamp-3 leading-snug">' + escapeHtml(guide.name) + '</h3>' +
                        (isAutomatic ? '<p class="mt-1 text-xs text-on-surface-variant">Hướng dẫn điền tự động · ' + escapeHtml(guide.type) + '</p>' : '') +
                        (isDraft ? '<div class="mt-2">' + badgeHtml + '</div>' : '') +
                        (isAutomatic ? '' : '<div class="mt-3 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">' +
                            '<button onclick="editGuide(\'' + guide.id + '\')" class="text-[13px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1">' +
                                '<span class="material-symbols-outlined text-[16px]">edit</span> Sửa' +
                            '</button>' +
                            '<button onclick="deleteGuide(\'' + guide.id + '\')" class="text-[13px] font-semibold text-error hover:underline cursor-pointer flex items-center gap-1">' +
                                '<span class="material-symbols-outlined text-[16px]">delete</span> Xóa' +
                            '</button>' +
                        '</div>') +
                    '</div>' +
                '</div>';
            container.insertAdjacentHTML('beforeend', cardHtml);
        });
    }

    window.targetGuideToEdit = null;
    
    window.navigateToGuideEdit = function(id) {
        window.targetGuideToEdit = id;
        window.location.hash = '#docs-guide';
    };

    async function initDocsGuideModule() {
        if (window.SupabaseService) {
            guidesList = (await window.SupabaseService.getDocuments() || []).filter(isGuideDocument);
        }
        renderGuideList();
        var stepsContainer = document.getElementById('guide-steps-container');
        if (stepsContainer && stepsContainer.children.length === 0) {
            if (typeof window.addGuideStep === 'function') {
                window.addGuideStep();
            }
        }
        var notesContainer = document.getElementById('guide-notes-container');
        if (notesContainer && notesContainer.children.length === 0) {
            if (typeof window.addGuideNote === 'function') {
                window.addGuideNote();
            }
        }
        
        if (window.targetGuideToEdit) {
            var gId = window.targetGuideToEdit;
            window.targetGuideToEdit = null; // consume it
            // if guide exists, edit it. Otherwise just open the form to create
            var guideExists = guidesList.find(function(g) { return g.id === gId; });
            if (guideExists) {
                editGuide(gId);
            } else {
                openGuideForm();
            }
        } else {
            // Default to list view
            var listEl = document.getElementById('docs-guide-list-view');
            var formEl = document.getElementById('docs-guide-form-view');
            if (listEl && formEl) {
                listEl.classList.remove('hidden');
                formEl.classList.add('hidden');
            }
        }
    }

    // Helper functions for Guide Steps
    window.addGuideStep = function() {
        var container = document.getElementById('guide-steps-container');
        if (!container) return;
        var html = 
            '<div class="guide-step relative bg-surface border border-outline-variant/60 rounded-xl p-5 pt-6 shadow-sm group hover:border-primary/50 transition-colors">' +
                '<button type="button" class="absolute top-2 right-2 p-1 text-on-surface-variant hover:text-error hover:bg-error-container rounded-full transition-colors opacity-0 group-hover:opacity-100" title="Xóa bước này" onclick="removeGuideStep(this)">' +
                    '<span class="material-symbols-outlined text-[20px]">close</span>' +
                '</button>' +
                '<div class="flex gap-4 items-start">' +
                    '<div class="w-10 h-10 shrink-0 bg-primary text-on-primary rounded-full flex items-center justify-center font-bold text-[18px] step-number shadow-sm mt-1"></div>' +
                    '<div class="flex-1 space-y-4">' +
                        '<div>' +
                            '<label class="block text-[14px] font-semibold text-on-surface mb-2">Tiêu đề (Header)</label>' +
                            '<input type="text" class="w-full p-3 bg-surface-container-lowest border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-[15px]" placeholder="VD: Nhập thông tin...">' +
                        '</div>' +
                        '<div>' +
                            '<label class="block text-[14px] font-semibold text-on-surface mb-2">Nội dung hướng dẫn</label>' +
                            '<textarea class="w-full p-3 bg-surface-container-lowest border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-y text-[15px]" rows="3" placeholder="Chi tiết cách điền..."></textarea>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        container.insertAdjacentHTML('beforeend', html);
        window.updateGuideStepNumbers();
    };

    window.removeGuideStep = function(buttonElement) {
        var stepElement = buttonElement.closest('.guide-step');
        if(stepElement) {
            stepElement.remove();
            window.updateGuideStepNumbers();
        }
    };

    window.updateGuideStepNumbers = function() {
        var steps = document.querySelectorAll('.guide-step');
        steps.forEach(function(step, index) {
            var stepNum = step.querySelector('.step-number');
            if (stepNum) stepNum.textContent = index + 1;
        });
    };

    window.addGuideNote = function() {
        var container = document.getElementById('guide-notes-container');
        if (!container) return;
        var html = 
            '<div class="guide-note relative bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm group hover:border-primary/50 transition-colors flex gap-3 items-start">' +
                '<span class="material-symbols-outlined text-primary mt-1 text-[22px]">info</span>' +
                '<textarea class="flex-1 p-2 bg-transparent border-none focus:ring-0 outline-none resize-y text-[15px] text-on-surface" rows="2" placeholder="Nhập nội dung lưu ý..."></textarea>' +
                '<button type="button" class="p-1.5 mt-0.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full transition-colors opacity-0 group-hover:opacity-100" title="Xóa lưu ý" onclick="window.requestRemoveGuideNote(this)">' +
                    '<span class="material-symbols-outlined text-[18px]">close</span>' +
                '</button>' +
            '</div>';
        container.insertAdjacentHTML('beforeend', html);
    };

    window.noteToDelete = null;
    window.requestRemoveGuideNote = function(buttonElement) {
        window.noteToDelete = buttonElement.closest('.guide-note');
        var modal = document.getElementById('docs-note-delete-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    window.closeDocsNoteDeleteModal = function() {
        window.noteToDelete = null;
        var modal = document.getElementById('docs-note-delete-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    window.confirmDocsNoteDelete = function() {
        if (window.noteToDelete) {
            window.noteToDelete.remove();
        }
        window.closeDocsNoteDeleteModal();
    };

    function escapeHtml(unsafe) {
        return (unsafe || '').toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    async function loadAllAdminData() {
        if (window.SupabaseService) {
            try {
                let allUsers = await SupabaseService.getUsers() || [];
                usersList = allUsers.filter(u => u.role !== 'admin');
                
                projectsList = await SupabaseService.getProjects() || [];
                guidesList = (await SupabaseService.getDocuments() || []).filter(isGuideDocument);
                // newsList = await SupabaseService.getNews() || [];
                
                var rawFaqs = await SupabaseService.getFaqs() || [];
                faqData = {};
                rawFaqs.forEach(f => {
                    var cat = f.category || 'general';
                    if (!faqData[cat]) faqData[cat] = [];
                    faqData[cat].push({ id: f.id, q: f.question, a: f.answer });
                });
                if (getCurrentPage() === 'faq') renderFaqList();
                
                // Sort by categories maybe, or just let UI handle it.
                
                // Cập nhật bảng và thống kê
                renderUserTable();
                renderProjectsTable(projectsList);
                renderGuideList();
                
                isDataLoaded = true;

                var totalUsersStat = document.getElementById('user-stat-total');
                if (totalUsersStat) {
                    totalUsersStat.textContent = usersList.length.toLocaleString('vi-VN');
                }
                
                var dashRegStat = document.getElementById('dash-stat-reg');
                if (dashRegStat) {
                    dashRegStat.textContent = usersList.length.toLocaleString('vi-VN');
                }

                if (getCurrentPage() === 'dashboard') {
                    initDashboardChart();
                }
            } catch(e) {
                console.error('Error loading data from Supabase:', e);
            }
        }
    }

    // ---- Init ---- //
    document.addEventListener('DOMContentLoaded', async function() {
        if (!checkAdminSessionExpiration()) return;
        if (!await window.SupabaseService.refreshAuthSession()) {
            localStorage.removeItem('adminSessionExpiresAt');
            window.location.href = 'admin-login.html';
            return;
        }
        var profile = await window.SupabaseService.getCurrentProfile();
        if (!profile || profile.role !== 'admin') {
            await window.SupabaseService.signOut();
            window.location.href = 'admin-login.html';
            return;
        }
        localStorage.setItem('adminUser', JSON.stringify(profile));
        initSidebar();
        onRouteChange();
        initDocsFilter();
        initFaqModule();
        loadAllAdminData();
        window.addEventListener('hashchange', onRouteChange);
        
        // Auto-refresh admin data every 10 seconds to keep live active users count fresh
        setInterval(loadAllAdminData, 10000);
    });

})();
