const API_BASE_URL = 'http://localhost:3000/api/v1';

function checkAdminSessionExpiration() {
    var expiresAt = localStorage.getItem('adminSessionExpiresAt');
    var token = localStorage.getItem('adminToken');
    if (token && expiresAt) {
        if (Date.now() > parseInt(expiresAt, 10)) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            localStorage.removeItem('adminSessionExpiresAt');
                        alert('Vui lòng nhập đầy đủ câu hỏi và câu trả lời!');
            window.location.href = 'admin-login.html';
            return false;
        }
    }
    return true;
}

window.handleAdminLogout = function() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống Admin Central?')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('adminSessionExpiresAt');
        window.location.href = 'admin-login.html';
    }
};

/* ============================================
   ADMIN SPA - JavaScript
   File: assets/js/admin.js
   Description: SPA Router, Sidebar, Upload, Charts
   ============================================ */

(function() {
    'use strict';

    // ---- SPA Router ---- //
    const PAGES = {
        'dashboard':     { title: 'Tổng quan',           parent: null },
        'users':         { title: 'Người dùng',          parent: null },
        'projects':      { title: 'Danh sách dự án',     parent: 'projects' },
        'projects-new':  { title: 'Thêm dự án mới',      parent: 'projects' },
        'docs':          { title: 'Danh sách tài liệu',  parent: 'docs' },
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
            initDashboardChart();
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
            // Consume edit session so any subsequent route change resets form
            isEditingProjectSession = false;
        } else {
            resetProjectNewForm();
        }
        if (page === 'docs') {
            initDocsFilter();
        }
        if (page === 'docs-new') {
            initDropzones();
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
                navigateTo(this.getAttribute('data-page'));
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
                navigateTo(this.getAttribute('data-page'));
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
                    grid: { color: 'rgba(195, 198, 215, 0.3)' },
                    ticks: {
                        font: { family: 'Be Vietnam Pro', size: 12 },
                        color: '#737686'
                    }
                }
            }
        };
    };

    function initDashboardChart() {
        // 1. Chart: Tăng trưởng truy cập
        var canvasAccess = document.getElementById('applicationsChart');
        if (canvasAccess) {
            if (chartInstanceAccess) {
                chartInstanceAccess.destroy();
            }
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
                        pointRadius: 0, // Không hiện nút tròn mặc định
                        pointHoverRadius: 6, // Chỉ hiện nút tròn tại điểm trỏ chuột
                        pointHoverBackgroundColor: '#ffffff',
                        pointHoverBorderColor: '#2563eb',
                        pointHoverBorderWidth: 3
                    }]
                },
                options: commonChartOptions(' lượt')
            });
        }

        // 2. Chart: Tăng trưởng người đăng ký
        var canvasRegistered = document.getElementById('registeredUsersChart');
        if (canvasRegistered) {
            if (chartInstanceRegistered) {
                chartInstanceRegistered.destroy();
            }
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
                        pointRadius: 0, // Không hiện nút tròn mặc định
                        pointHoverRadius: 6, // Chỉ hiện nút tròn tại điểm trỏ chuột
                        pointHoverBackgroundColor: '#ffffff',
                        pointHoverBorderColor: '#006c49',
                        pointHoverBorderWidth: 3
                    }]
                },
                options: commonChartOptions(' người')
            });
        }
    }

    // ---- Drag-and-Drop Upload Zones ---- //
    function initDropzones() {
        setupDropzone('pdf-dropzone', 'pdf-input');
        setupDropzone('docx-dropzone', 'docx-input');
    }

    function setupDropzone(zoneId, inputId) {
        var dropzone = document.getElementById(zoneId);
        var input = document.getElementById(inputId);
        if (!dropzone || !input) return;

        dropzone.addEventListener('click', function() { input.click(); });

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
            // totalStat.textContent = usersList.length.toLocaleString('vi-VN');
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
                    html += '<div><label class="text-[11px] text-on-surface-variant font-medium block">Email:</label>';
                    html += '<input type="email" class="edit-input-email w-full px-2 py-1 border border-outline-variant rounded text-sm bg-surface-container-lowest text-on-surface focus:border-primary focus:outline-none" value="' + escapeHtml(user.email) + '" placeholder="Email"></div>';
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
                    html += '<button class="btn-delete-user p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded transition-colors" title="Xóa" data-index="' + realIndex + '"><span class="material-symbols-outlined text-[20px]">delete</span></button>';
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
                var emailVal = row.querySelector('.edit-input-email').value.trim();
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

        document.querySelectorAll('.btn-delete-user').forEach(function(btn) {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                var idx = parseInt(this.getAttribute('data-index'), 10);
                var user = usersList[idx];
                if (confirm('Bạn có chắc chắn muốn xóa người dùng "' + user.name + '" khỏi hệ thống không?')) {
                    try {
                        await window.SupabaseService.deleteUser(user.id);
                        usersList = await window.SupabaseService.getUsers() || [];
                        handleUserSearch();
                    } catch (err) {
                        console.error(err);
                        alert('Xóa người dùng thất bại!');
                    }
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
                            email: pendingUserTempData.email
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

        if (titleEl) titleEl.textContent = 'Thông tin chi tiết Dự án';
        if (nameInp) nameInp.value = '';
        if (ownerInp) ownerInp.value = '';
        if (statusSel) statusSel.value = 'Chờ xây dựng';
        if (descTxt) descTxt.value = '';

        isEditingProjectSession = false;
        currentEditingProjectIndex = null;
    }

    function getStatusPillClass(status) {
        if (status === 'Chờ xây dựng') return 'status-cho-xay-dung';
        if (status === 'Đang xây dựng') return 'status-dang-xay-dung';
        if (status === 'Đang nhận đơn') return 'status-dang-nhan-don';
        if (status === 'Chờ bàn giao') return 'status-cho-ban-giao';
        return 'status-dang-xay-dung';
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
            prj = {
                id: "#PJ-00" + (projectsList.length + 1),
                name: idOrName,
                location: "Hà Nội",
                owner: "Chủ đầu tư",
                status: "Đang xây dựng",
                desc: "Dự án " + idOrName
            };
            projectsList.push(prj);
            idx = projectsList.length - 1;
        }

        isEditingProjectSession = true;
        currentEditingProjectIndex = idx;

        var titleEl = document.getElementById('prj-form-header-title');
        var nameInp = document.getElementById('prj-input-name');
        var ownerInp = document.getElementById('prj-input-owner');
        var statusSel = document.getElementById('prj-select-status');
        var descTxt = document.getElementById('prj-textarea-desc');

        if (titleEl) titleEl.textContent = 'Chỉnh sửa Dự án: ' + prj.name;
        if (nameInp) nameInp.value = prj.name;
        if (ownerInp) ownerInp.value = prj.owner;
        if (statusSel) statusSel.value = prj.status;
        if (descTxt) descTxt.value = prj.desc || '';

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
            var pillClass = getStatusPillClass(prj.status);

            html += '<tr class="hover:bg-surface-container-low transition-colors group">' +
                '<td class="p-4 border-b border-outline-variant text-sm font-semibold text-on-surface whitespace-nowrap">' + prj.id + '</td>' +
                '<td class="p-4 border-b border-outline-variant">' +
                    '<div class="flex items-center gap-3">' +
                        '<img src="' + prj.img + '" alt="' + prj.name + '" class="w-12 h-10 rounded object-cover flex-shrink-0">' +
                        '<span class="text-sm font-semibold text-on-surface line-clamp-1 cursor-pointer hover:text-primary hover:underline transition-colors btn-edit-title" data-index="' + realIdx + '">' + prj.name + '</span>' +
                    '</div>' +
                '</td>' +
                '<td class="p-4 border-b border-outline-variant text-sm text-on-surface-variant whitespace-nowrap">' + prj.location + '</td>' +
                '<td class="p-4 border-b border-outline-variant text-sm text-on-surface-variant whitespace-nowrap">' + prj.owner + '</td>' +
                '<td class="p-4 border-b border-outline-variant whitespace-nowrap min-w-[150px]">' +
                    '<span class="status-pill ' + pillClass + ' whitespace-nowrap">' + prj.status + '</span>' +
                '</td>' +
                '<td class="p-4 border-b border-outline-variant text-right align-middle whitespace-nowrap">' +
                    '<div class="flex items-center justify-end gap-1">' +
                        '<button class="p-2 text-on-surface-variant hover:text-primary transition-colors btn-edit-project cursor-pointer" data-index="' + realIdx + '" title="Chỉnh sửa"><span class="material-symbols-outlined text-[20px]">edit</span></button>' +
                        '<button class="p-2 text-on-surface-variant hover:text-error transition-colors btn-delete-project cursor-pointer" data-index="' + realIdx + '" title="Xóa dự án"><span class="material-symbols-outlined text-[20px]">delete</span></button>' +
                    '</div>' +
                '</td>' +
            '</tr>';
        });

        tbody.innerHTML = html;

        // Attach Edit listeners to both edit button and project title
        tbody.querySelectorAll('.btn-edit-project, .btn-edit-title').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var idx = parseInt(this.getAttribute('data-index'), 10);
                var prj = projectsList[idx];
                if (!prj) return;

                openProjectEdit(prj.name);
            });
        });

        // Attach Delete listeners
        tbody.querySelectorAll('.btn-delete-project').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var idx = parseInt(this.getAttribute('data-index'), 10);
                var prj = projectsList[idx];
                if (!prj) return;

                pendingDeleteProjectIndex = idx;

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
                var normName = removeAccents(prj.name.toLowerCase());
                var normLoc = removeAccents(prj.location.toLowerCase());
                var normOwner = removeAccents(prj.owner.toLowerCase());
                matchSearch = normID.indexOf(query) !== -1 ||
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

        if (saveBtn) {
            saveBtn.onclick = async function(e) {
                e.preventDefault();
                var nameInp = document.getElementById('prj-input-name');
                var ownerInp = document.getElementById('prj-input-owner');
                var statusSel = document.getElementById('prj-select-status');
                var descTxt = document.getElementById('prj-textarea-desc');

                var nameVal = nameInp ? nameInp.value.trim() : '';
                if (!nameVal) {
                    alert('Vui lòng nhập tên dự án!');
                    return;
                }

                // Show loading state on button
                var originalText = saveBtn.innerHTML;
                saveBtn.innerHTML = '<span class="material-symbols-outlined animate-spin mr-2">progress_activity</span> Đang lưu...';
                saveBtn.disabled = true;

                try {
                    var projectData = {
                        name: nameVal,
                        owner: ownerInp ? ownerInp.value.trim() : 'Chủ đầu tư mới',
                        status: statusSel ? statusSel.value : 'Chờ xây dựng',
                        desc: descTxt ? descTxt.value : ''
                    };

                    if (currentEditingProjectIndex !== null && projectsList[currentEditingProjectIndex]) {
                        // Update
                        var pId = projectsList[currentEditingProjectIndex].id;
                        await window.SupabaseService.updateProject(pId, projectData);
                    } else {
                        // Create
                        await window.SupabaseService.addProject(projectData);
                    }

                    // Reload from Supabase
                    projectsList = await window.SupabaseService.getProjects() || [];
                    
                    resetProjectNewForm();
                    navigateTo('projects');
                    renderProjectsTable(projectsList);
                } catch (err) {
                    console.error('Error saving project:', err);
                    alert('Có lỗi xảy ra khi lưu dự án!');
                } finally {
                    saveBtn.innerHTML = originalText;
                    saveBtn.disabled = false;
                }
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
                        '<p class="text-[11px] text-on-surface-variant mt-0.5">PNG, JPG, tối đa 5MB</p>' +
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

    function initDocsFilter() {
        var btn = document.getElementById('docs-filter-btn');
        var menu = document.getElementById('docs-filter-menu');
        var arrow = document.getElementById('docs-filter-arrow');
        var label = document.getElementById('docs-filter-label');
        var options = document.querySelectorAll('.docs-filter-option');
        var searchInput = document.querySelector('#page-docs input[type="text"]');
        var docRows = document.querySelectorAll('#page-docs tbody tr');

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

                    var faqData = {
        'doi-tuong': [
            {
                q: 'Ai được quyền mua NOXH?',
                a: 'Căn cứ theo Điều 76 Luật Nhà ở 2023, có 10 nhóm đối tượng chính được hưởng chính sách hỗ trợ về nhà ở xã hội. Đặc biệt, từ ngày 01/7/2026, pháp luật bổ sung thêm 1 nhóm căn cứ theo Luật Dân số 2025. Cụ thể bao gồm 11 nhóm:\n\nNhóm 1: Người có công với cách mạng, thân nhân liệt sĩ thuộc diện được hỗ trợ theo quy định của pháp luật về ưu đãi người có công.\nNhóm 2: Hộ gia đình nghèo và cận nghèo tại khu vực nông thôn.\nNhóm 3: Hộ gia đình tại khu vực nông thôn thuộc vùng thường xuyên bị ảnh hưởng bởi thiên tai, biến đổi khí hậu.\nNhóm 4: Người thu nhập thấp, hộ nghèo, cận nghèo tại khu vực đô thị.\nNhóm 5: Công nhân, người lao động đang làm việc tại các doanh nghiệp trong và ngoài khu công nghiệp.\nNhóm 6: Sĩ quan, quân nhân chuyên nghiệp, hạ sĩ quan, công nhân và viên chức quốc phòng, công an.\nNhóm 7: Cán bộ, công chức, viên chức theo quy định của pháp luật.\nNhóm 8: Các đối tượng đã trả lại nhà ở công vụ theo quy định của pháp luật.\nNhóm 9: Hộ gia đình, cá nhân bị thu hồi đất và phải giải tỏa, phá dỡ nhà ở mà chưa được Nhà nước bồi thường bằng nhà ở, đất ở.\nNhóm 10: Doanh nghiệp, hợp tác xã, liên hiệp hợp tác xã trong khu công nghiệp đầu tư xây dựng nhà lưu trú hoặc thuê nhà lưu trú cho công nhân.\nNhóm 11 (Bổ sung từ 01/7/2026): Hộ gia đình sinh từ 3 con trở lên đáp ứng các tiêu chuẩn về diện tích chỗ ở và thu nhập quy định tại Luật Dân số 2025.'
            },
            {
                q: 'Người độc thân có được mua NOXH không?',
                a: 'Có. Pháp luật không phân biệt tình trạng hôn nhân khi xét duyệt đối tượng mua NOXH. Người độc thân hoàn toàn được quyền đăng ký mua nếu chứng minh được bản thân thuộc một trong các nhóm đối tượng quy định (ví dụ: người thu nhập thấp tại đô thị) và đáp ứng đủ các điều kiện về nhà ở, thu nhập.'
            },
            {
                q: 'Lao động tự do, không có hợp đồng lao động có được mua không?',
                a: 'Được phép mua. Lao động tự do sẽ được xếp vào nhóm "Người thu nhập thấp tại khu vực đô thị". Để chứng minh thu nhập, người lao động tự do không cần hợp đồng lao động mà thực hiện việc tự kê khai mức thu nhập hàng tháng và tự chịu trách nhiệm trước pháp luật về tính chính xác của thông tin kê khai.'
            },
            {
                q: 'Không có hộ khẩu hoặc sổ tạm trú tại tỉnh/thành phố có dự án thì mua được không?',
                a: 'Được mua. Kể từ khi Luật Nhà ở 2023 có hiệu lực, điều kiện về cư trú (yêu cầu phải có đăng ký thường trú hoặc tạm trú tại tỉnh/thành phố trực thuộc trung ương nơi có dự án NOXH) đã được bãi bỏ hoàn toàn, giúp người dân dễ dàng tiếp cận nhà ở hơn.'
            },
            {
                q: 'Người nước ngoài hoặc người Việt Nam định cư ở nước ngoài (Việt kiều) được mua NOXH không?',
                a: 'Không. Theo quy định hiện hành, chính sách Nhà ở xã hội là chính sách an sinh xã hội đặc thù chỉ dành riêng cho công dân Việt Nam sinh sống trong nước và thuộc các nhóm đối tượng đã được pháp luật quy định.'
            },
            {
                q: 'Đã sở hữu nhà ở nhưng diện tích quá nhỏ có được mua NOXH không?',
                a: 'Được mua. Căn cứ theo Điều 78 Luật Nhà ở 2023, nếu hộ gia đình đã có nhà ở thuộc sở hữu của mình nhưng diện tích nhà ở bình quân đầu người của các thành viên trong hộ gia đình dưới 15m² sàn/người thì vẫn được coi là đáp ứng điều kiện về nhà ở để đăng ký mua NOXH.'
            },
            {
                q: 'Lực lượng vũ trang (quân đội, công an) có chính sách NOXH riêng biệt không?',
                a: 'Có. Lực lượng vũ trang nhân dân không chỉ thuộc nhóm đối tượng được mua NOXH thông thường (khoản 6 Điều 76) mà còn được hưởng một cơ chế riêng là "Nhà ở cho lực lượng vũ trang nhân dân", với các tiêu chuẩn và khu nhà ở được phát triển chuyên biệt phù hợp với đặc thù công tác.'
            },
            {
                q: 'Người đang hưởng lương hưu có đủ điều kiện mua NOXH không?',
                a: 'Có. Người nghỉ hưu nếu đáp ứng điều kiện chưa có nhà ở (hoặc diện tích dưới 15m²/người) và tổng mức lương hưu thực nhận hàng tháng nằm trong giới hạn quy định thì sẽ được xét duyệt dưới tư cách là nhóm "Người thu nhập thấp tại khu vực đô thị".'
            },
            {
                q: 'Đã từng được Nhà nước giao đất, cấp đất có được xét duyệt mua NOXH không?',
                a: 'Không. Một trong những điều kiện tiên quyết là người đăng ký và các thành viên trong hộ gia đình chưa từng được Nhà nước hỗ trợ về nhà ở, đất đai dưới bất kỳ hình thức nào. Nếu đã từng được cấp đất, hồ sơ sẽ bị loại để nhường cơ hội cho người khác.'
            },
            {
                q: 'Sinh viên mới ra trường có thuộc đối tượng được mua NOXH không?',
                a: 'Sinh viên mới ra trường nếu đã chính thức ký hợp đồng lao động thì sẽ được xét vào nhóm "Công nhân, người lao động". Nếu làm việc tự do, sẽ xét vào nhóm "Người thu nhập thấp". Trong cả hai trường hợp, chỉ cần chứng minh đủ điều kiện về thu nhập và nhà ở thì đều được quyền đăng ký mua.'
            },
            {
                q: 'Vợ và chồng có được làm hai bộ hồ sơ độc lập để tăng cơ hội trúng bốc thăm không?',
                a: 'Tuyệt đối không. Theo nguyên tắc của Luật Nhà ở, chính sách hỗ trợ NOXH được xét duyệt theo đơn vị "hộ gia đình". Mỗi hộ gia đình (bao gồm vợ, chồng và các con chưa thành niên) chỉ được hưởng chính sách hỗ trợ này duy nhất một lần.'
            },
            {
                q: 'Nếu vợ/chồng đã đứng tên sở hữu một bất động sản khác, người còn lại có được mua NOXH không?',
                a: 'Không được. Cơ quan nhà nước sẽ kiểm tra thực trạng nhà ở của toàn bộ thành viên trong hộ gia đình (theo Giấy chứng nhận kết hôn và sổ hộ khẩu/thông tin cư trú). Chỉ cần một người trong hộ gia đình đã có nhà, toàn bộ hộ gia đình đó sẽ không đủ điều kiện mua.'
            },
            {
                q: 'Bố mẹ ruột có nhà, nhưng con cái đã tách hộ khẩu ra riêng thì có được tính là "chưa có nhà ở" không?',
                a: 'Có. Nếu người con đã tách khẩu, trở thành chủ hộ của một sổ hộ khẩu riêng độc lập (hoặc có thông tin cư trú độc lập trên cơ sở dữ liệu quốc gia) và bản thân người con chưa từng đứng tên bất động sản nào, thì người con đó hoàn toàn đủ điều kiện làm hồ sơ mua NOXH.'
            },
            {
                q: 'Doanh nghiệp có được phép mua đứt NOXH để làm chỗ ở cho nhân viên không?',
                a: 'Doanh nghiệp trong khu công nghiệp không được phép mua đứt để sở hữu riêng, nhưng được quyền thuê hoặc mua "nhà lưu trú công nhân" (một loại hình NOXH đặc thù) để bố trí cho công nhân, người lao động của mình thuê lại trong thời gian làm việc.'
            },
            {
                q: 'Đã từng mua một căn NOXH, sau đó bán đi hợp pháp, nay có được làm hồ sơ mua căn thứ hai không?',
                a: 'Không. Căn cứ theo quy định của pháp luật, chính sách hỗ trợ mua, thuê mua nhà ở xã hội chỉ được áp dụng giải quyết một lần duy nhất cho mỗi cá nhân/hộ gia đình. Việc đã bán đi không làm phát sinh lại quyền được mua lần hai.'
            },
            {
                q: 'Hộ nghèo, hộ cận nghèo tại khu vực nông thôn có cần chứng minh thu nhập để mua NOXH không?',
                a: 'Không. Nhóm đối tượng này (Nhóm 2 và Nhóm 3 theo Điều 76) đã được cơ quan có thẩm quyền cấp Giấy chứng nhận hộ nghèo/cận nghèo nên được miễn tiêu chí chứng minh thu nhập, chỉ cần đáp ứng điều kiện về thực trạng nhà ở.'
            },
            {
                q: 'Người khuyết tật có được đặc cách xét duyệt hồ sơ mua NOXH không?',
                a: 'Người khuyết tật không được miễn hoàn toàn quy trình xét duyệt, nhưng hồ sơ của họ (hoặc hộ gia đình có thành viên là người khuyết tật) sẽ được cộng điểm ưu tiên trong thang điểm đánh giá, giúp họ có lợi thế trúng tuyển cao hơn khi số lượng hồ sơ vượt quá số lượng căn hộ.'
            },
            {
                q: 'Người có công với cách mạng được hưởng mức ưu tiên như thế nào?',
                a: 'Người có công với cách mạng thuộc nhóm đối tượng số 1. Trong quy trình chấm điểm hồ sơ (thang điểm 100), đối tượng này được cộng số điểm ưu tiên cao nhất so với các nhóm khác, do đó gần như chắc chắn sẽ được quyền mua nếu hồ sơ hợp lệ.'
            },
            {
                q: 'Có bắt buộc phải tham gia Bảo hiểm xã hội (BHXH) đủ 1 năm mới được mua NOXH không?',
                a: 'Không. Nhằm tháo gỡ khó khăn cho người dân, Luật Nhà ở 2023 và các Nghị định hướng dẫn mới nhất đã bãi bỏ hoàn toàn điều kiện bắt buộc phải có thời gian tham gia BHXH tại tỉnh, thành phố nơi có dự án.'
            },
            {
                q: 'Học sinh, sinh viên đang đi học tại các trường đại học có được mua NOXH không?',
                a: 'Không được mua. Căn cứ khoản 10 Điều 76 Luật Nhà ở 2023, học sinh, sinh viên, học viên tại các trường đại học, học viện, cao đẳng, dạy nghề chỉ thuộc đối tượng được thuê nhà ở xã hội trong thời gian học tập, không thuộc đối tượng được mua hoặc thuê mua.'
            }
        ],
        'dieu-kien': [
            {
                q: 'Mức trần thu nhập tối đa để đủ điều kiện mua NOXH được quy định như thế nào?',
                a: 'Theo Nghị định 136/2026/NĐ-CP (áp dụng từ tháng 4/2026), đối với người độc thân, thu nhập bình quân không vượt quá 20 triệu đồng/tháng. Đối với người đã kết hôn, tổng thu nhập của hai vợ chồng không vượt quá 50 triệu đồng/tháng. Đối với người độc thân đang trực tiếp nuôi con nhỏ, mức trần là 35 triệu đồng/tháng.'
            },
            {
                q: 'Quy trình đăng ký và xét duyệt hồ sơ mua NOXH gồm những bước nào?',
                a: 'Quy trình chuẩn gồm 05 bước: (1) Khách hàng nộp hồ sơ trực tiếp tại văn phòng Chủ đầu tư; (2) Chủ đầu tư tiếp nhận và chấm điểm, xét duyệt hồ sơ; (3) Chủ đầu tư gửi danh sách dự kiến trúng lên Sở Xây dựng để kiểm tra chéo; (4) Sở Xây dựng trả kết quả thẩm định; (5) Chủ đầu tư thông báo khách hàng lên ký Hợp đồng mua bán.'
            },
            {
                q: 'Người dân phải nộp hồ sơ đăng ký mua NOXH trực tiếp tại đâu?',
                a: 'Hồ sơ đăng ký phải được nộp trực tiếp tại Ban quản lý dự án hoặc văn phòng tiếp nhận hồ sơ chính thức của Chủ đầu tư dự án đó. Sở Xây dựng chỉ là cơ quan quản lý nhà nước, không có chức năng tiếp nhận hồ sơ trực tiếp từ người dân.'
            },
            {
                q: 'Có thể ủy quyền cho người thân, bạn bè đi nộp hồ sơ đăng ký thay được không?',
                a: 'Không. Theo quy định để tránh tình trạng "cò mồi", trục lợi chính sách, người đứng đơn đăng ký mua NOXH (hoặc vợ/chồng của người đứng đơn) phải mang theo CCCD bản gốc để trực tiếp nộp hồ sơ và ký sổ tiếp nhận tại văn phòng Chủ đầu tư.'
            },
            {
                q: 'Một bộ hồ sơ pháp lý hoàn chỉnh để mua NOXH bao gồm những loại giấy tờ nào?',
                a: 'Một bộ hồ sơ chuẩn bao gồm: Đơn đăng ký mua NOXH (theo mẫu); Bản sao công chứng CCCD/Giấy khai sinh của các thành viên; Giấy xác nhận tình trạng hôn nhân (hoặc Giấy đăng ký kết hôn); Giấy xác nhận thực trạng nhà ở (xin tại phường/xã); và Giấy xác nhận thu nhập (xin tại công ty hoặc tự kê khai).'
            },
            {
                q: 'Thủ tục xin Giấy xác nhận chưa có nhà ở (thực trạng nhà ở) được thực hiện ở cơ quan nào?',
                a: 'Người làm hồ sơ mang theo giấy tờ tùy thân đến Ủy ban nhân dân cấp xã/phường/thị trấn nơi mình đang cư trú (thường trú hoặc tạm trú) để xin xác nhận vào mẫu biểu quy định. Cơ quan này có trách nhiệm kiểm tra và xác nhận trong vòng 3-5 ngày làm việc.'
            },
            {
                q: 'Xin Giấy xác nhận điều kiện về thu nhập ở đâu là hợp lệ?',
                a: 'Nếu bạn đang đi làm tại doanh nghiệp/cơ quan nhà nước, bạn nộp mẫu đơn cho bộ phận Kế toán hoặc Nhân sự để công ty ký và đóng dấu giáp lai xác nhận. Nếu bạn là lao động tự do, bạn tự điền thông tin thu nhập vào mẫu tự kê khai và tự chịu trách nhiệm trước pháp luật.'
            },
            {
                q: 'Đang có mã số thuế cá nhân và phải đóng thuế TNCN thì hồ sơ có bị loại không?',
                a: 'Không bị loại, miễn là sau khi trừ đi các khoản giảm trừ gia cảnh, thu nhập thực nhận bình quân hàng tháng của bạn không vượt quá mức trần quy định (như 20 triệu với người độc thân hoặc 50 triệu/tháng với hai vợ chồng).'
            },
            {
                q: 'Thời gian từ khi nộp hồ sơ đến khi biết kết quả xét duyệt mất bao lâu?',
                a: 'Thông thường, Chủ đầu tư sẽ có thời gian từ 15 đến 30 ngày làm việc (không tính thứ Bảy, Chủ nhật) kể từ ngày hết hạn nhận hồ sơ để tiến hành rà soát, chấm điểm và công bố danh sách khách hàng dự kiến đủ điều kiện mua.'
            },
            {
                q: 'Phải nộp bao nhiêu bộ hồ sơ cho Chủ đầu tư và có cần công chứng tất cả không?',
                a: 'Người đăng ký chỉ cần nộp 01 bộ hồ sơ duy nhất. Trong đó, các loại Đơn từ, Giấy xác nhận nhà ở, Giấy xác nhận thu nhập phải nộp Bản gốc. Các giấy tờ tùy thân (CCCD, Đăng ký kết hôn, Giấy khai sinh) nộp bản sao y có công chứng hợp lệ.'
            },
            {
                q: 'Người dân có phải đóng bất kỳ khoản phí nào khi nộp hồ sơ mua NOXH không?',
                a: 'Tuyệt đối không. Việc phát hành biểu mẫu, tư vấn và tiếp nhận hồ sơ đăng ký mua NOXH phải được Chủ đầu tư thực hiện hoàn toàn miễn phí. Mọi hành vi thu phí "giữ chỗ", "xét duyệt", "bôi trơn" từ môi giới hay CĐT đều là vi phạm pháp luật.'
            },
            {
                q: 'Hệ thống chấm điểm ưu tiên khi số hồ sơ nộp vào lớn hơn số căn hộ hoạt động ra sao?',
                a: 'Hồ sơ được chấm theo thang điểm 100. Điểm số được cộng dồn dựa trên các tiêu chí: Thuộc nhóm đối tượng ưu tiên (VD: Người có công được điểm cao nhất), tình trạng khó khăn về nhà ở (chưa có nhà được điểm cao hơn có nhà chật hẹp), và các yếu tố nhân khẩu học khác (khuyết tật, hộ nghèo).'
            },
            {
                q: 'Quy trình bốc thăm giành quyền mua diễn ra trong trường hợp nào?',
                a: 'Nếu số lượng hồ sơ đạt yêu cầu (hồ sơ hợp lệ) có cùng mức điểm bằng nhau và tổng số lượng hồ sơ này lớn hơn số lượng căn hộ mở bán của dự án, Chủ đầu tư bắt buộc phải tổ chức bốc thăm công khai, minh bạch dưới sự giám sát của đại diện Sở Xây dựng để chọn ra người trúng quyền mua.'
            },
            {
                q: 'Nếu không trúng bốc thăm, tôi có được nhận lại hồ sơ gốc đã nộp không?',
                a: 'Có. Pháp luật quy định Chủ đầu tư có trách nhiệm phải hoàn trả lại nguyên vẹn bộ hồ sơ gốc cho những khách hàng không trúng bốc thăm, để người dân có thể sử dụng hồ sơ đó tiếp tục nộp tại các dự án NOXH khác.'
            },
            {
                q: 'Khách hàng có quyền được tự lựa chọn số căn, số tầng, hoặc hướng nhà khi mua NOXH không?',
                a: 'Trường hợp số hồ sơ ít hơn số căn hộ, khách hàng được quyền tự thỏa thuận chọn căn với CĐT. Trường hợp phải bốc thăm do thiếu cung, khách hàng sẽ bốc thăm 2 lần: Lần 1 bốc thăm quyền mua, Lần 2 bốc thăm ngẫu nhiên để xác định vị trí căn hộ, tầng, tòa cụ thể (không được tự chọn).'
            },
            {
                q: 'Thời điểm nào người mua sẽ chính thức ký Hợp đồng mua bán với Chủ đầu tư?',
                a: 'Người mua sẽ được ký Hợp đồng mua bán sau khi danh sách dự kiến trúng thưởng đã được Sở Xây dựng địa phương rà soát, thẩm định (kiểm tra chéo) trong thời gian khoảng 15 ngày làm việc và xác nhận không có trường hợp nào vi phạm quy định sở hữu nhà ở.'
            },
            {
                q: 'Khi nào thì bắt đầu phải đóng tiền và đóng đợt 1 bao nhiêu phần trăm?',
                a: 'Tiến độ đóng tiền phụ thuộc vào thỏa thuận trong Hợp đồng mua bán và tiến độ xây dựng thực tế. Thông thường, khách hàng phải thanh toán Đợt 1 tối đa 30% giá trị căn hộ ngay sau khi hai bên ký kết Hợp đồng mua bán.'
            },
            {
                q: 'Các biểu mẫu đơn từ xin xác nhận nhà ở và thu nhập phải lấy từ đâu để đảm bảo hợp lệ?',
                a: 'Khách hàng không được tự soạn đơn mà bắt buộc phải sử dụng các biểu mẫu chuẩn ban hành kèm theo Phụ lục của Nghị định số 136/2026/NĐ-CP (hoặc các nghị định mới nhất có hiệu lực tại thời điểm nộp hồ sơ).'
            },
            {
                q: 'Quy trình "kiểm tra chéo" của Sở Xây dựng nhằm mục đích gì?',
                a: 'Sở Xây dựng sử dụng hệ thống cơ sở dữ liệu quốc gia về đất đai và nhà ở để rà soát chéo các thành viên trong hộ gia đình đăng ký. Mục đích nhằm loại bỏ ngay lập tức những cá nhân đang đứng tên bất động sản trên địa bàn, hoặc những người đã từng mua NOXH tại một dự án khác.'
            },
            {
                q: 'Nếu khi nộp vào, Chủ đầu tư báo hồ sơ bị thiếu sót giấy tờ thì tôi có được bổ sung không?',
                a: 'Được phép bổ sung. Khi tiếp nhận, nếu hồ sơ chưa hợp lệ, bộ phận tiếp nhận phải ghi rõ các giấy tờ còn thiếu vào Phiếu hướng dẫn và khách hàng sẽ có một khoảng thời gian (thường từ 3 đến 7 ngày) để hoàn thiện và nộp bổ sung trước khi chốt danh sách chấm điểm.'
            }
        ],
        'vay-von': [
            {
                q: 'Có những gói vay ưu đãi hỗ trợ tài chính nào dành riêng cho người mua NOXH?',
                a: 'Hiện tại có 2 kênh vay vốn chính: (1) Kênh từ Ngân hàng Chính sách xã hội (NHCSXH) với nguồn vốn từ ngân sách nhà nước, lãi suất cực kỳ ưu đãi; và (2) Các gói tín dụng thương mại được Nhà nước cấp bù lãi suất (như gói 120.000 tỷ đồng) triển khai qua các ngân hàng thương mại do Ngân hàng Nhà nước chỉ định.'
            },
            {
                q: 'Hạn mức vay vốn tối đa để mua NOXH là bao nhiêu phần trăm giá trị căn hộ?',
                a: 'Căn cứ theo quy định của pháp luật về tín dụng chính sách, người mua NOXH có thể được vay vốn với hạn mức tối đa lên tới 80% giá trị hợp đồng mua bán hoặc hợp đồng thuê mua nhà ở xã hội.'
            },
            {
                q: 'Thời hạn vay vốn tối đa để người mua có thể trả góp là bao nhiêu năm?',
                a: 'Để giảm áp lực tài chính hàng tháng cho người thu nhập thấp, thời hạn vay vốn tối đa được Ngân hàng Chính sách xã hội và các ngân hàng thương mại quy định có thể kéo dài lên tới 25 năm (300 tháng).'
            },
            {
                q: 'Điều kiện cốt lõi để được duyệt vay vốn qua Ngân hàng Chính sách xã hội là gì?',
                a: 'Khách hàng phải đáp ứng 3 điều kiện tiên quyết: Phải có Hợp đồng mua bán hợp pháp với Chủ đầu tư; Phải chứng minh có vốn tự có tối thiểu 20% giá trị căn hộ; và toàn bộ thành viên trong hộ gia đình không có nợ xấu tại hệ thống Trung tâm Thông tin Tín dụng Quốc gia (CIC).'
            },
            {
                q: 'Tiến độ thanh toán tiền mua nhà đối với dự án NOXH đang xây dựng được chia ra sao?',
                a: 'Đối với NOXH hình thành trong tương lai, việc thanh toán phải chia thành nhiều đợt theo tiến độ xây dựng thực tế. Đợt thanh toán đầu tiên không vượt quá 30% giá trị HĐMB, và trước khi bàn giao nhà, tổng số tiền khách hàng đã thanh toán không được vượt quá 70% giá trị căn hộ (trừ khi khách hàng tự nguyện đóng nhiều hơn).'
            },
            {
                q: 'Lãi suất vay ưu đãi có được giữ cố định trong suốt 25 năm trả góp không?',
                a: 'Không cố định hoàn toàn. Lãi suất tại NHCSXH sẽ được điều chỉnh theo quyết định của Thủ tướng Chính phủ trong từng thời kỳ (thường rất ổn định). Đối với gói vay thương mại, lãi suất sẽ được ưu đãi cố định trong một thời gian đầu (ví dụ 3-5 năm), sau đó sẽ được thả nổi theo biên độ thị trường.'
            },
            {
                q: 'Đã từng bị nợ xấu (thuộc nhóm 3, 4, 5) trên CIC có được ngân hàng duyệt vay mua NOXH không?',
                a: 'Tuyệt đối không. Theo quy định quản trị rủi ro của Ngân hàng Nhà nước, tất cả các tổ chức tín dụng (kể cả NHCSXH) sẽ từ chối giải ngân đối với khách hàng đang có nợ xấu hoặc có lịch sử nợ xấu trong vòng 3-5 năm gần nhất.'
            },
            {
                q: 'Nếu tôi có tiền mặt và muốn tất toán (trả nợ trước hạn), tôi có bị ngân hàng tính phí phạt không?',
                a: 'Nếu vay vốn qua Ngân hàng Chính sách xã hội, bạn thường được miễn hoàn toàn phí phạt trả nợ trước hạn. Tuy nhiên, nếu vay qua các ngân hàng thương mại, bạn sẽ phải chịu mức phí phạt tất toán dao động từ 1% đến 3% tính trên số dư nợ gốc thực tế còn lại, tùy thuộc vào quy định của từng ngân hàng.'
            },
            {
                q: 'Tôi có thể dùng chính căn hộ NOXH đang dự định mua làm tài sản thế chấp để vay vốn không?',
                a: 'Hoàn toàn có thể. Pháp luật cho phép người mua sử dụng chính hợp đồng mua bán và căn hộ hình thành trong tương lai đó làm "tài sản bảo đảm" (thế chấp) cho khoản vay, khách hàng không cần phải có bất động sản thế chấp độc lập bên ngoài.'
            },
            {
                q: 'Hiện nay, những ngân hàng thương mại nào đang được phép giải ngân các gói vay NOXH?',
                a: 'Các ngân hàng thương mại nhà nước đóng vai trò chủ lực bao gồm: Agribank (Ngân hàng NN&PTNT), BIDV (Ngân hàng Đầu tư và Phát triển), Vietcombank (Ngân hàng Ngoại thương), Vietinbank (Ngân hàng Công thương) và một số Ngân hàng TMCP khác khi được Ngân hàng Nhà nước phân bổ chỉ tiêu tín dụng riêng.'
            },
            {
                q: 'Người lớn tuổi (trên 50 tuổi) có bị giới hạn thời gian vay vốn mua nhà không?',
                a: 'Có. Các ngân hàng đều có quy định nghiêm ngặt về độ tuổi tất toán khoản vay. Thông thường, độ tuổi thực tế của người vay cộng với thời hạn vay vốn không được vượt quá 65 hoặc 70 tuổi (tùy chính sách từng ngân hàng). Người 50 tuổi chỉ có thể vay tối đa 15-20 năm thay vì 25 năm.'
            },
            {
                q: 'Chi phí bảo trì căn hộ NOXH là bao nhiêu và phải đóng tại thời điểm nào?',
                a: 'Theo quy định của Luật Nhà ở, người mua phải đóng Kinh phí bảo trì phần sở hữu chung nhà chung cư bằng 2% giá trị hợp đồng (tính trên giá chưa bao gồm thuế VAT). Khoản tiền này phải thanh toán một lần ngay trước thời điểm Chủ đầu tư ký biên bản bàn giao căn hộ.'
            },
            {
                q: 'Nếu tôi có sẵn đủ tiền mặt, tôi có bắt buộc phải vay qua ngân hàng chính sách không?',
                a: 'Không bắt buộc. Nếu bạn có đủ tiềm lực tài chính, bạn hoàn toàn có thể sử dụng 100% vốn tự có (tiền mặt) để thanh toán theo tiến độ hợp đồng trực tiếp cho Chủ đầu tư mà không cần thông qua bất kỳ tổ chức tín dụng nào.'
            },
            {
                q: 'Nếu vợ bị nợ xấu, chồng đứng tên hồ sơ vay độc lập với ngân hàng có được chấp nhận không?',
                a: 'Không được chấp nhận. Trong quan hệ hôn nhân, ngân hàng sẽ đánh giá rủi ro tín dụng của cả hai vợ chồng trên hệ thống CIC. Chỉ cần một người (vợ hoặc chồng) có lịch sử nợ xấu, ngân hàng sẽ từ chối cấp tín dụng cho người còn lại.'
            },
            {
                q: 'Ngân hàng đánh giá tỷ lệ "thu nhập/khoản trả nợ" hàng tháng như thế nào để quyết định giải ngân?',
                a: 'Ngân hàng sử dụng chỉ số DTI (Debt-to-Income). Để được duyệt vay, khách hàng phải chứng minh được dòng tiền ổn định sao cho tổng số tiền trả nợ (cả gốc và lãi) hàng tháng chỉ chiếm tối đa từ 50% đến 70% tổng thu nhập thực nhận của gia đình, phần còn lại đảm bảo chi phí sinh hoạt thiết yếu.'
            },
            {
                q: 'Người vay mua NOXH có được hưởng chính sách ân hạn nợ gốc không?',
                a: 'Có. Nhiều tổ chức tín dụng có chính sách hỗ trợ ân hạn nợ gốc (chỉ trả tiền lãi, không trả tiền gốc) trong khoảng thời gian từ 12 đến 24 tháng đầu tiên, đặc biệt là trong giai đoạn dự án đang thi công và khách hàng chưa nhận được bàn giao nhà.'
            },
            {
                q: 'Hình thức "giải ngân song song" giữa ngân hàng và người mua hoạt động như thế nào?',
                a: 'Giải ngân song song là thỏa thuận mà trong đó, ở mỗi đợt thanh toán cho Chủ đầu tư, người mua và ngân hàng sẽ cùng chia nhau đóng tiền theo tỷ lệ cơ cấu vốn (ví dụ: khách hàng đóng 20%, ngân hàng giải ngân 80% ngay từ đợt đầu), giúp khách hàng không phải lo huy động một số tiền mặt lớn cùng lúc.'
            },
            {
                q: 'Chi phí thẩm định giá tài sản và công chứng thế chấp ngân hàng do bên nào chi trả?',
                a: 'Theo quy định hiện hành, người đi vay (khách hàng mua nhà) có nghĩa vụ phải thanh toán mọi chi phí liên quan đến việc định giá tài sản bảo đảm, phí công chứng hợp đồng thế chấp và lệ phí đăng ký giao dịch bảo đảm tại cơ quan nhà nước (tổng chi phí này thường rơi vào khoảng vài triệu đồng).'
            },
            {
                q: 'Phí quản lý vận hành chung cư NOXH có đắt đỏ như chung cư thương mại không?',
                a: 'Không. Nhằm bảo vệ người thu nhập thấp, mức phí quản lý vận hành NOXH bị khống chế trần. Ủy ban nhân dân cấp tỉnh/thành phố sẽ ban hành khung giá dịch vụ quản lý vận hành nhà chung cư, đảm bảo mức phí này luôn thấp hơn và hợp lý hơn nhiều so với nhà ở thương mại cùng phân khúc.'
            },
            {
                q: 'Lãi suất cho vay của Ngân hàng Chính sách xã hội đối với NOXH trong những năm gần đây dao động ở mức nào?',
                a: 'Lãi suất này do Thủ tướng Chính phủ quyết định theo từng thời kỳ để cân đối vĩ mô. Giai đoạn trước năm 2024, lãi suất duy trì ổn định ở mức 4.8%/năm; đến giai đoạn 2024-2025 điều chỉnh lên khoảng 6.6%/năm. Đây vẫn là mức lãi suất ưu đãi thấp nhất trên thị trường tín dụng bất động sản.'
            }
        ],
        'quyen-so-huu': [
            {
                q: 'Nhà ở xã hội sau khi bàn giao sẽ được cấp sổ hồng với thời hạn sở hữu là bao nhiêu năm?',
                a: 'Giống hệt như nhà ở thương mại, đối với dự án NOXH được xây dựng trên đất được giao có thu tiền hoặc giao đất ổn định lâu dài để xây dựng nhà ở, người mua sẽ được cấp Giấy chứng nhận (Sổ hồng) với thời hạn "Sở hữu lâu dài" (không có thời hạn).'
            },
            {
                q: 'Sau khi nhận nhà, người mua phải chờ bao lâu mới được phép chuyển nhượng, bán lại NOXH?',
                a: 'Căn cứ Điều 39 Nghị định 100/2024/NĐ-CP và các quy định của Luật Nhà ở, người mua chỉ được phép chuyển nhượng, bán lại nhà ở xã hội sau thời gian tối thiểu là 05 năm, tính từ ngày bên mua đã thanh toán đủ 100% tiền mua nhà cho Chủ đầu tư.'
            },
            {
                q: 'Nếu chưa đủ 5 năm mà gia đình gặp biến cố cần tiền, tôi có thể bán nhà cho ai không?',
                a: 'Trong thời gian chưa đủ 5 năm, pháp luật nghiêm cấm giao dịch thương mại tự do. Người mua chỉ có hai lựa chọn duy nhất: Bán lại cho chính Chủ đầu tư dự án đó, hoặc chuyển nhượng lại cho một cá nhân khác cũng đáp ứng đầy đủ các điều kiện được mua NOXH theo quy định.'
            },
            {
                q: 'Trong thời gian chờ đủ 5 năm, tôi có được phép cho thuê căn hộ NOXH của mình không?',
                a: 'Không. Luật Nhà ở 2023 quy định rất rõ ràng: Người mua NOXH không được phép cho thuê lại trong thời gian 05 năm đầu. Căn nhà phải được sử dụng đúng mục đích là giải quyết nhu cầu ở thực của chính hộ gia đình đã đăng ký mua.'
            },
            {
                q: 'Sau khi đã đáp ứng đủ điều kiện 5 năm, việc bán lại NOXH có bị khống chế giá trần không?',
                a: 'Không bị khống chế giá. Khi đã đủ 5 năm và đã được cấp Sổ hồng, căn NOXH đó được phép tham gia giao dịch trên thị trường bất động sản như một căn nhà ở thương mại bình thường. Chủ nhà có quyền tự định giá bán theo nguyên tắc thuận mua vừa bán.'
            },
            {
                q: 'Khi bán lại NOXH sau 5 năm, tôi có phải nộp bổ sung Tiền sử dụng đất cho Nhà nước không?',
                a: 'Có. Do khi mua NOXH bạn đã được miễn tiền sử dụng đất, nên khi bán lại, bạn phải nộp nghĩa vụ tài chính này. Cụ thể: Nộp 50% tiền sử dụng đất đối với nhà liền kề/thấp tầng, hoặc nộp theo hệ số phân bổ diện tích đối với căn hộ chung cư, tính theo bảng giá đất do UBND tỉnh ban hành.'
            },
            {
                q: 'Mua bán trái phép NOXH (chưa đủ 5 năm) qua hình thức Lập vi bằng có giá trị pháp lý không?',
                a: 'Tuyệt đối không có giá trị pháp lý. Vi bằng chỉ là văn bản ghi nhận sự kiện giao nhận tiền, không phải là Hợp đồng chuyển nhượng quyền sở hữu. Giao dịch này vô hiệu trước pháp luật, người mua qua vi bằng đối mặt với rủi ro mất trắng tài sản nếu có tranh chấp hoặc bị nhà nước thanh tra.'
            },
            {
                q: 'Nếu cơ quan chức năng phát hiện hành vi mua bán NOXH sai quy định, hậu quả xử lý ra sao?',
                a: 'Căn cứ Điều 125 Luật Nhà ở 2023, các giao dịch mua bán, cho thuê trái quy định pháp luật sẽ bị tuyên vô hiệu. Cơ quan quản lý nhà nước (UBND cấp tỉnh hoặc Sở Xây dựng) có quyền ra quyết định cưỡng chế thu hồi lại căn hộ NOXH đó để giao cho đối tượng khác có nhu cầu.'
            },
            {
                q: 'Tôi có được phép đăng ký kinh doanh, dùng NOXH để làm văn phòng, trụ sở công ty không?',
                a: 'Không. Luật Nhà ở nghiêm cấm hành vi sử dụng căn hộ chung cư (bao gồm cả chung cư thương mại và NOXH) vào mục đích không phải để ở, như mở văn phòng, cơ sở sản xuất, kinh doanh thương mại.'
            },
            {
                q: 'Nhà ở xã hội có được để lại thừa kế cho con cái hoặc người thân không?',
                a: 'Hoàn toàn được. Quyền sở hữu nhà ở hợp pháp được pháp luật bảo vệ. Khi chủ sở hữu qua đời, căn NOXH đó trở thành di sản và được phân chia thừa kế theo quy định của pháp luật Dân sự (theo di chúc hoặc theo pháp luật) mà không bị ràng buộc bởi thời hạn 5 năm.'
            },
            {
                q: 'Trong trường hợp vợ chồng ly hôn, căn hộ NOXH đang trong thời hạn 5 năm sẽ được phân chia như thế nào?',
                a: 'Căn hộ vẫn là tài sản chung của vợ chồng. Việc phân chia sẽ được thực hiện dựa trên thỏa thuận tự nguyện của hai bên hoặc theo phán quyết của Tòa án nhân dân. Việc đổi tên chủ sở hữu trên Hợp đồng hoặc Sổ hồng trong trường hợp ly hôn được pháp luật chấp thuận.'
            },
            {
                q: 'Quy trình sang tên Sổ hồng NOXH sau 5 năm yêu cầu người bán phải nộp những loại thuế phí gì?',
                a: 'Khi giao dịch hợp lệ sau 5 năm, hai bên phải nộp: Thuế thu nhập cá nhân (thường là 2% tính trên giá trị chuyển nhượng), Lệ phí trước bạ (0.5% do bên mua nộp), Phí thẩm định hồ sơ, và đặc biệt là Khoản tiền sử dụng đất phải nộp bổ sung cho Nhà nước (như đã nêu ở câu 6).'
            },
            {
                q: 'Chủ nhà có được phép tự ý đập thông hai căn NOXH hoặc cơi nới diện tích ban công không?',
                a: 'Tuyệt đối không. Bất kỳ hành vi thay đổi kết cấu chịu lực, kiến trúc mặt ngoài, đập thông căn hộ mà chưa có bản vẽ xin phép và chưa được sự phê duyệt bằng văn bản của Cơ quan quản lý trật tự xây dựng đều là vi phạm pháp luật và sẽ bị phạt nặng, yêu cầu hoàn trả hiện trạng.'
            },
            {
                q: 'Kể từ lúc nhận bàn giao nhà, người mua phải chờ tối đa bao lâu để được cấp Sổ hồng?',
                a: 'Theo quy định của Luật Kinh doanh Bất động sản và Luật Đất đai, trong thời hạn 50 ngày kể từ ngày bàn giao nhà cho người mua, Chủ đầu tư phải có trách nhiệm nộp hồ sơ lên cơ quan tài nguyên môi trường để làm thủ tục cấp Giấy chứng nhận (Sổ hồng) cho khách hàng, trừ khi khách hàng muốn tự làm.'
            },
            {
                q: 'Nếu Chủ đầu tư cố tình chây ì, chậm làm Sổ hồng cho cư dân NOXH thì bị xử lý thế nào?',
                a: 'Chủ đầu tư sẽ bị xử phạt vi phạm hành chính trong lĩnh vực đất đai. Tùy thuộc vào thời gian chậm trễ và số lượng căn hộ bị chậm cấp sổ, mức phạt bằng tiền có thể lên tới 1 tỷ đồng đối với tổ chức vi phạm, đồng thời bị buộc phải khẩn trương hoàn thành thủ tục pháp lý.'
            },
            {
                q: 'Người mua NOXH có được phép làm thủ tục đăng ký thường trú (làm Sổ hộ khẩu mới) tại địa chỉ căn hộ không?',
                a: 'Có. Căn hộ NOXH là chỗ ở hợp pháp, có Hợp đồng mua bán rõ ràng. Người mua hoàn toàn đủ điều kiện mang Hợp đồng và Biên bản bàn giao ra cơ quan Công an phường/xã để làm thủ tục đăng ký thường trú theo đúng Luật Cư trú hiện hành.'
            },
            {
                q: 'Trong trường hợp tòa nhà NOXH quá cũ nát, bị giải tỏa trong tương lai, chủ nhà có được bồi thường không?',
                a: 'Có. Chủ sở hữu NOXH được bảo vệ quyền lợi hợp pháp. Khi có quyết định thu hồi đất và giải tỏa để xây dựng lại hoặc phục vụ lợi ích công cộng, chủ nhà sẽ được bồi thường, hỗ trợ tái định cư theo các nguyên tắc bồi thường chung của pháp luật về Đất đai tại thời điểm thu hồi.'
            },
            {
                q: 'Nếu mua NOXH nhưng không ở, cứ khóa cửa để trống trong nhiều năm thì có bị thu hồi không?',
                a: 'Có rủi ro bị thu hồi. Bản chất của chính sách là giải quyết nhu cầu "có chỗ ở thực". Việc để nhà hoang hóa, không sử dụng có thể bị xếp vào nhóm hành vi mua nhằm mục đích đầu cơ, trục lợi chính sách. Khi cơ quan nhà nước thanh tra phát hiện sử dụng không đúng mục đích, nhà ở có thể bị thu hồi.'
            },
            {
                q: 'Nếu một căn NOXH đã đủ điều kiện 5 năm và được bán ra thị trường tự do, người nước ngoài có được mua lại căn đó không?',
                a: 'Không. Dù đã hết hạn 5 năm khống chế, nhưng bản chất nguồn gốc dự án vẫn là đất xây dựng nhà ở xã hội. Pháp luật Việt Nam chưa cho phép tổ chức, cá nhân nước ngoài được sở hữu nhà ở tại các dự án thuộc diện đầu tư xây dựng nhà ở xã hội.'
            },
            {
                q: 'Để lách luật bán nhà trước 5 năm, tôi có thể làm Hợp đồng ủy quyền quản lý sử dụng vô thời hạn cho người khác không?',
                a: 'Không. Việc ký Hợp đồng ủy quyền toàn quyền định đoạt, sử dụng vô thời hạn bản chất là một hình thức lách luật, che giấu giao dịch chuyển nhượng trái phép. Nếu xảy ra tranh chấp pháp lý hoặc cơ quan chức năng phát hiện, hợp đồng này sẽ bị Tòa án tuyên vô hiệu do giả tạo, và tài sản đối diện nguy cơ bị thu hồi.'
            }
        ]
    };


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
            guidesList = await window.SupabaseService.getDocuments() || [];
            
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
                guidesList = await window.SupabaseService.getDocuments() || [];
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
            var badgeHtml = isDraft ? '<span class="px-2 py-0.5 bg-surface-variant text-on-surface-variant text-[11px] font-bold rounded-full">Nháp</span>' : '';
            var bgClass = isDraft ? 'bg-surface-container-lowest/50' : 'bg-surface-container-lowest';
            var cardHtml = 
                '<div class="' + bgClass + ' border border-outline-variant rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary transition-all group flex gap-4 items-start min-h-[100px]">' +
                    '<div class="w-10 h-10 mt-0.5 shrink-0 rounded-full bg-primary text-white flex items-center justify-center">' +
                        '<span class="material-symbols-outlined text-[20px]">menu_book</span>' +
                    '</div>' +
                    '<div class="flex-1 min-w-0 flex flex-col">' +
                        '<h3 class="font-semibold text-[15px] text-on-surface line-clamp-3 leading-snug">' + escapeHtml(guide.name) + '</h3>' +
                        (isDraft ? '<div class="mt-2">' + badgeHtml + '</div>' : '') +
                        '<div class="mt-3 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">' +
                            '<button onclick="editGuide(\'' + guide.id + '\')" class="text-[13px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1">' +
                                '<span class="material-symbols-outlined text-[16px]">edit</span> Sửa' +
                            '</button>' +
                            '<button onclick="deleteGuide(\'' + guide.id + '\')" class="text-[13px] font-semibold text-error hover:underline cursor-pointer flex items-center gap-1">' +
                                '<span class="material-symbols-outlined text-[16px]">delete</span> Xóa' +
                            '</button>' +
                        '</div>' +
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

    function initDocsGuideModule() {
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
                guidesList = await SupabaseService.getDocuments() || [];
                // newsList = await SupabaseService.getNews() || [];
                
                var rawFaqs = await SupabaseService.getFaqs() || [];
                faqData = {};
                rawFaqs.forEach(f => {
                    var cat = f.category || 'general';
                    if (!faqData[cat]) faqData[cat] = [];
                    faqData[cat].push({ id: f.id, q: f.question, a: f.answer });
                });
                
                // Sort by categories maybe, or just let UI handle it.
                
                // Cập nhật bảng và thống kê
                renderUserTable();
                renderProjectTable();
                renderDocsTable();
                
                var totalUsersStat = document.getElementById('user-stat-total');
                if (totalUsersStat) {
                    totalUsersStat.textContent = usersList.length.toLocaleString('vi-VN');
                }
                
                var dashRegStat = document.getElementById('dash-stat-reg');
                if (dashRegStat) {
                    dashRegStat.textContent = usersList.length.toLocaleString('vi-VN');
                }
            } catch(e) {
                console.error('Error loading data from Supabase:', e);
            }
        }
    }

    // ---- Init ---- //
    document.addEventListener('DOMContentLoaded', function() {
        if (!checkAdminSessionExpiration()) return;
        initSidebar();
        onRouteChange();
        initDocsFilter();
        initFaqModule();
        loadAllAdminData();
        window.addEventListener('hashchange', onRouteChange);
    });

})();
