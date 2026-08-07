function togglePasswordVis() {
            var pwd = document.getElementById('admin-password');
            var icon = document.getElementById('pass-vis-icon');
            if (pwd.type === 'password') {
                pwd.type = 'text';
                icon.textContent = 'visibility';
            } else {
                pwd.type = 'password';
                icon.textContent = 'visibility_off';
            }
        }

        function showAlert(msg, isError = true) {
            var alertBox = document.getElementById('login-alert');
            var alertText = document.getElementById('login-alert-text');
            if (msg) {
                alertText.textContent = msg;
                alertBox.classList.remove('hidden');
                if (isError) {
                    alertBox.className = "p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium flex items-center gap-2";
                } else {
                    alertBox.className = "p-3.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 font-medium flex items-center gap-2";
                }
            } else {
                alertBox.classList.add('hidden');
            }
        }

        async function handleAdminLogin(e) {
            e.preventDefault();
            var email = document.getElementById('admin-email').value.trim();
            var password = document.getElementById('admin-password').value.trim();
            var btnSubmit = document.getElementById('btn-login-submit');
            var btnText = document.getElementById('btn-login-text');

            if (!email || !password) {
                showAlert('Vui lòng nhập đầy đủ email và mật khẩu');
                return;
            }

            btnSubmit.disabled = true;
            btnText.textContent = 'Đang xác thực...';

            try {
                var result = await window.SupabaseService.signInWithPassword(email, password);
                if (!result.success || !result.user || result.user.role !== 'admin') {
                    if (result.success) await window.SupabaseService.signOut();
                    showAlert(result.success ? 'Tài khoản này không có quyền quản trị.' : (result.error || 'Email hoặc mật khẩu không chính xác!'));
                    btnSubmit.disabled = false;
                    btnText.textContent = 'Đăng nhập Admin';
                    return;
                }
                localStorage.setItem('adminUser', JSON.stringify(result.user));
                localStorage.setItem('adminSessionExpiresAt', String(Date.now() + (30 * 24 * 60 * 60 * 1000)));
                showAlert('Đăng nhập thành công! Đang chuyển hướng...', false);
                setTimeout(function() { window.location.href = 'admin.html#dashboard'; }, 800);
            } catch (err) {
                showAlert('Có lỗi kết nối. Vui lòng thử lại!');
                btnSubmit.disabled = false;
                btnText.textContent = 'Đăng nhập Admin';
            }
        }