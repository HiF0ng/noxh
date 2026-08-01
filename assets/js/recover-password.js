document.addEventListener('DOMContentLoaded', () => {
    const emailForm = document.getElementById('recovery-email-form');
    const codeForm = document.getElementById('recovery-code-form');
    const passwordForm = document.getElementById('recovery-password-form');
    const success = document.getElementById('recovery-success');
    const message = document.getElementById('recovery-message');
    const title = document.getElementById('recovery-title');
    const description = document.getElementById('recovery-description');
    let recoveryEmail = '';

    const showMessage = (text, isError = true) => {
        message.textContent = text;
        message.className = `mb-sm rounded-lg px-3 py-2 text-sm ${isError ? 'bg-error-container text-error' : 'bg-primary/10 text-primary'}`;
    };
    const clearMessage = () => message.classList.add('hidden');
    const showStep = (form) => {
        [emailForm, codeForm, passwordForm].forEach(item => item.classList.add('hidden'));
        form.classList.remove('hidden');
    };

    emailForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage();
        const email = document.getElementById('recovery-email').value.trim().toLowerCase();
        if (!window.SupabaseService) return showMessage('Không thể kết nối cơ sở dữ liệu.');
        const user = await window.SupabaseService.getUser(email);
        if (!user) return showMessage('Email này chưa được đăng ký tài khoản.');
        recoveryEmail = email;
        title.textContent = 'Xác thực email';
        description.textContent = `Nhập mã xác thực gồm 6 chữ số cho ${email}.`;
        showStep(codeForm);
        showMessage('Chế độ tạm thời: mã xác thực là 123456.', false);
        document.getElementById('recovery-code').focus();
    });

    codeForm.addEventListener('submit', (event) => {
        event.preventDefault();
        clearMessage();
        if (document.getElementById('recovery-code').value.trim() !== '123456') return showMessage('Mã xác thực không đúng.');
        title.textContent = 'Đặt mật khẩu mới';
        description.textContent = 'Nhập và xác nhận mật khẩu mới của bạn.';
        showStep(passwordForm);
        document.getElementById('recovery-new-password').focus();
    });

    passwordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage();
        const password = document.getElementById('recovery-new-password').value;
        const confirmation = document.getElementById('recovery-confirm-password').value;
        if (password.length < 6) return showMessage('Mật khẩu mới cần có ít nhất 6 ký tự.');
        if (password !== confirmation) return showMessage('Mật khẩu xác nhận không khớp.');
        const updated = await window.SupabaseService.resetPasswordByEmail(recoveryEmail, password);
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
