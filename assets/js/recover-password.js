document.addEventListener('DOMContentLoaded', () => {
    const emailForm = document.getElementById('recovery-email-form');
    const codeForm = document.getElementById('recovery-code-form');
    const passwordForm = document.getElementById('recovery-password-form');
    const message = document.getElementById('recovery-message');
    const title = document.getElementById('recovery-title');
    const description = document.getElementById('recovery-description');
    const success = document.getElementById('recovery-success');
    const sendButton = document.getElementById('recovery-send-button');
    const resendButton = document.getElementById('recovery-resend-button');
    const otpWrap = document.getElementById('recovery-otp-inputs');
    const otpInputs = [...document.querySelectorAll('.otp-cell')];
    let recoveryEmail = '';
    let resendTimer;

    const showMessage = html => { message.innerHTML = html; message.className = 'mb-sm rounded-lg px-3 py-2 text-sm bg-error-container text-error'; };
    const clearMessage = () => message.classList.add('hidden');
    const showOnly = form => { [emailForm, codeForm, passwordForm, success].forEach(item => item.classList.add('hidden')); form.classList.remove('hidden'); };
    const setSending = sending => {
        sendButton.disabled = sending;
        sendButton.innerHTML = sending ? '<span class="recovery-spinner" aria-label="Đang gửi"></span>' : '<span class="material-symbols-outlined text-[18px]">send</span><span>Gửi mã xác nhận</span>';
    };
    const cooldown = (seconds = 60) => {
        clearInterval(resendTimer); let left = seconds; resendButton.disabled = true;
        const render = () => { resendButton.textContent = `Gửi lại mã sau ${left}s`; };
        render(); resendTimer = setInterval(() => { left--; if (left <= 0) { clearInterval(resendTimer); resendButton.disabled = false; resendButton.textContent = 'Gửi lại mã xác thực'; } else render(); }, 1000);
    };
    const code = () => otpInputs.map(item => item.value).join('');
    const showOtpError = text => { otpWrap.classList.remove('is-invalid'); void otpWrap.offsetWidth; otpWrap.classList.add('is-invalid'); showMessage(text); };

    otpInputs.forEach((input, index) => {
        input.addEventListener('input', e => { const digit = e.target.value.replace(/\D/g, '').slice(-1); e.target.value = digit; otpWrap.classList.remove('is-invalid'); if (digit && index < 5) otpInputs[index + 1].focus(); });
        input.addEventListener('keydown', e => { if (e.key === 'Backspace' && !input.value && index) otpInputs[index - 1].focus(); });
        input.addEventListener('paste', e => { e.preventDefault(); const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6); [...digits].forEach((digit, i) => otpInputs[i].value = digit); otpInputs[Math.min(digits.length, 5)].focus(); });
    });
    document.querySelectorAll('.password-visibility-toggle').forEach(button => button.addEventListener('click', () => {
        const input = button.previousElementSibling; const reveal = input.type === 'password'; input.type = reveal ? 'text' : 'password'; button.querySelector('span').textContent = reveal ? 'visibility' : 'visibility_off'; button.setAttribute('aria-label', reveal ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    }));

    emailForm.addEventListener('submit', async e => {
        e.preventDefault(); clearMessage();
        const email = document.getElementById('recovery-email').value.trim().toLowerCase();
        if (!email || !document.getElementById('recovery-email').checkValidity()) return showMessage('Vui lòng nhập địa chỉ email hợp lệ.');
        if (!window.SupabaseService) return showMessage('Không thể kết nối dịch vụ xác thực.');
        setSending(true);
        try {
            const sent = await window.SupabaseService.requestPasswordReset(email);
            if (!sent.success) return showMessage(sent.error);
            recoveryEmail = email; title.textContent = 'Nhập mã xác thực'; description.textContent = 'Nhập mã gồm 6 chữ số được gửi đến email của bạn.';
            otpInputs.forEach(input => input.value = ''); showOnly(codeForm); cooldown(); otpInputs[0].focus();
        } catch (_) { showMessage('Không thể gửi mã xác thực. Vui lòng thử lại.'); }
        finally { setSending(false); }
    });
    resendButton.addEventListener('click', async () => {
        if (!recoveryEmail || resendButton.disabled) return; resendButton.disabled = true; resendButton.textContent = 'Đang gửi lại mã...'; clearMessage();
        const sent = await window.SupabaseService.requestPasswordReset(recoveryEmail);
        if (!sent.success) { resendButton.disabled = false; resendButton.textContent = 'Gửi lại mã xác thực'; return showMessage(sent.error); }
        otpInputs.forEach(input => input.value = ''); cooldown(); otpInputs[0].focus();
    });
    codeForm.addEventListener('submit', async e => {
        e.preventDefault(); clearMessage(); const token = code();
        if (!/^\d{6}$/.test(token)) return showOtpError('Vui lòng nhập đúng mã xác thực gồm 6 chữ số.');
        const verified = await window.SupabaseService.verifyRecoveryOtp(recoveryEmail, token);
        if (!verified.success) return showOtpError(verified.error);
        title.textContent = 'Đặt mật khẩu mới'; description.textContent = 'Nhập và xác nhận mật khẩu mới của bạn.'; showOnly(passwordForm); document.getElementById('recovery-new-password').focus();
    });
    passwordForm.addEventListener('submit', async e => {
        e.preventDefault(); clearMessage(); const password = document.getElementById('recovery-new-password').value; const confirmation = document.getElementById('recovery-confirm-password').value;
        if (password.length < 6) return showMessage('Mật khẩu mới cần có ít nhất 6 ký tự.');
        if (password !== confirmation) return showMessage('Mật khẩu xác nhận không khớp.');
        const updated = await window.SupabaseService.updateAuthPassword(password);
        if (!updated.success) {
            const isSamePassword = /same|different|trùng|hiện tại/i.test(updated.error || '');
            return showMessage(isSamePassword
                ? 'Mật khẩu trùng với mật khẩu hiện tại. Vui lòng thử <a class="font-semibold underline" href="login.html">đăng nhập</a>.'
                : updated.error);
        }
        title.textContent = 'Hoàn tất đổi mật khẩu'; description.textContent = 'Mật khẩu của bạn đã được cập nhật. Đang điều hướng về trang chủ'; document.getElementById('recovery-heading-icon').classList.add('hidden'); document.getElementById('recovery-back-link').classList.add('hidden'); showOnly(success); window.setTimeout(() => window.location.href = 'homepage.html', 2200);
    });
});
