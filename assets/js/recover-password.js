document.addEventListener('DOMContentLoaded', () => {
    const emailForm = document.getElementById('recovery-email-form');
    const codeForm = document.getElementById('recovery-code-form');
    const passwordForm = document.getElementById('recovery-password-form');
    const success = document.getElementById('recovery-success');
    const message = document.getElementById('recovery-message');
    const title = document.getElementById('recovery-title');
    const description = document.getElementById('recovery-description');

    const showMessage = (text, isError = true) => {
        message.textContent = text;
        message.className = `mb-sm rounded-lg px-3 py-2 text-sm ${isError ? 'bg-error-container text-error' : 'bg-primary/10 text-primary'}`;
    };
    const clearMessage = () => message.classList.add('hidden');
    const showStep = (form) => {
        [emailForm, codeForm, passwordForm].forEach(item => item.classList.add('hidden'));
        form.classList.remove('hidden');
    };

    // Supabase sends a recovery session in the URL fragment after the user clicks the email link.
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (params.get('access_token') && params.get('refresh_token')) {
        localStorage.setItem('noxh_auth_session', JSON.stringify({
            access_token: params.get('access_token'), refresh_token: params.get('refresh_token'),
            user: { id: params.get('user_id') || '' }
        }));
        window.history.replaceState({}, document.title, window.location.pathname);
        title.textContent = 'Đặt mật khẩu mới';
        description.textContent = 'Nhập và xác nhận mật khẩu mới của bạn.';
        showStep(passwordForm);
    }

    emailForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage();
        const email = document.getElementById('recovery-email').value.trim().toLowerCase();
        if (!window.SupabaseService) return showMessage('Không thể kết nối dịch vụ xác thực.');
        const sent = await window.SupabaseService.requestPasswordReset(email);
        if (!sent) return showMessage('Không thể gửi email khôi phục. Vui lòng thử lại sau.');
        showMessage('Nếu email đã đăng ký, chúng tôi đã gửi liên kết đặt lại mật khẩu. Hãy mở email để tiếp tục.', false);
        emailForm.classList.add('hidden');
    });

    codeForm.classList.add('hidden');

    passwordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage();
        const password = document.getElementById('recovery-new-password').value;
        const confirmation = document.getElementById('recovery-confirm-password').value;
        if (password.length < 6) return showMessage('Mật khẩu mới cần có ít nhất 6 ký tự.');
        if (password !== confirmation) return showMessage('Mật khẩu xác nhận không khớp.');
        const updated = await window.SupabaseService.updateAuthPassword(password);
        if (!updated) return showMessage('Không thể đổi mật khẩu. Vui lòng thử lại.');
        passwordForm.classList.add('hidden');
        title.textContent = 'Hoàn tất';
        description.textContent = 'Mật khẩu của bạn đã được cập nhật.';
        success.classList.remove('hidden');
        let remaining = 5;
        const countdown = document.getElementById('recovery-countdown');
        const timer = setInterval(() => {
            remaining -= 1;
            countdown.textContent = remaining;
            if (remaining <= 0) {
                clearInterval(timer);
                window.location.href = 'login.html';
            }
        }, 1000);
    });
});
