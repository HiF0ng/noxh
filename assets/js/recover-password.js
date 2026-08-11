document.addEventListener('DOMContentLoaded', () => {
    const emailForm = document.getElementById('recovery-email-form');
    const codeForm = document.getElementById('recovery-code-form');
    const passwordForm = document.getElementById('recovery-password-form');
    const success = document.getElementById('recovery-success');
    const message = document.getElementById('recovery-message');
    const title = document.getElementById('recovery-title');
    const description = document.getElementById('recovery-description');
    const otpEntry = document.getElementById('recovery-otp-entry');
    const otpSuccess = document.getElementById('recovery-otp-success');
    const otpNotice = document.getElementById('recovery-otp-notice');
    const otpInputsWrap = document.getElementById('recovery-otp-inputs');
    const otpInputs = [...document.querySelectorAll('.otp-cell')];
    const resendButton = document.getElementById('recovery-resend-button');
    const backLink = document.getElementById('recovery-back-link');
    let recoveryEmail = '';
    let resendTimer = null;

    const showMessage = (text) => {
        message.textContent = text;
        message.className = 'mb-sm rounded-lg px-3 py-2 text-sm bg-error-container text-error';
    };
    const clearMessage = () => message.classList.add('hidden');
    const showStep = (form) => {
        [emailForm, codeForm, passwordForm, success].forEach(item => item.classList.add('hidden'));
        form.classList.remove('hidden');
    };
    const resetOtpNotice = () => {
        otpNotice.className = 'recovery-notice rounded-lg px-3 py-2 text-sm leading-relaxed mt-sm';
        otpNotice.textContent = 'Mã xác thực đã được gửi tới bạn thành công. Vui lòng kiểm tra mục Thư đến và Thư rác nếu bạn không thấy email.';
    };
    const getOtp = () => otpInputs.map(input => input.value).join('');
    const clearOtpError = () => otpInputsWrap.classList.remove('is-invalid');
    const showOtpError = (text) => {
        otpInputsWrap.classList.remove('is-invalid');
        void otpInputsWrap.offsetWidth;
        otpInputsWrap.classList.add('is-invalid');
        otpNotice.className = 'recovery-notice is-error rounded-lg px-3 py-2 text-sm leading-relaxed mt-sm';
        otpNotice.textContent = text;
    };
    const startResendCooldown = (seconds = 60) => {
        clearInterval(resendTimer);
        let remaining = seconds;
        resendButton.disabled = true;
        resendButton.textContent = `Gửi lại mã sau ${remaining}s`;
        resendTimer = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
                clearInterval(resendTimer);
                resendButton.disabled = false;
                resendButton.textContent = 'Gửi lại mã xác thực';
                return;
            }
            resendButton.textContent = `Gửi lại mã sau ${remaining}s`;
        }, 1000);
    };
    const showOtpVerified = () => {
        otpEntry.classList.add('recovery-collapse');
        window.setTimeout(() => {
            otpEntry.classList.add('hidden');
            otpSuccess.classList.remove('hidden');
            window.setTimeout(() => {
                title.textContent = 'Đặt mật khẩu mới';
                description.textContent = 'Nhập và xác nhận mật khẩu mới của bạn.';
                otpSuccess.classList.add('hidden');
                showStep(passwordForm);
                passwordForm.classList.add('recovery-expand');
                window.setTimeout(() => passwordForm.classList.remove('recovery-expand'), 400);
            }, 900);
        }, 260);
    };

    otpInputs.forEach((input, index) => {
        input.addEventListener('input', event => {
            const digits = event.target.value.replace(/\D/g, '');
            event.target.value = digits.slice(-1);
            clearOtpError();
            if (digits && index < otpInputs.length - 1) otpInputs[index + 1].focus();
        });
        input.addEventListener('keydown', event => {
            if (event.key === 'Backspace' && !input.value && index > 0) {
                otpInputs[index - 1].focus();
                otpInputs[index - 1].value = '';
            }
            if (event.key === 'ArrowLeft' && index > 0) otpInputs[index - 1].focus();
            if (event.key === 'ArrowRight' && index < otpInputs.length - 1) otpInputs[index + 1].focus();
        });
        input.addEventListener('paste', event => {
            event.preventDefault();
            const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            digits.split('').forEach((digit, digitIndex) => { if (otpInputs[digitIndex]) otpInputs[digitIndex].value = digit; });
            otpInputs[Math.min(digits.length, 5)].focus();
            clearOtpError();
        });
    });

    emailForm.addEventListener('submit', async event => {
        event.preventDefault();
        clearMessage();
        const email = document.getElementById('recovery-email').value.trim().toLowerCase();
        if (!window.SupabaseService) return showMessage('Không thể kết nối dịch vụ xác thực.');
        const sent = await window.SupabaseService.requestPasswordReset(email);
        if (!sent.success) return showMessage(sent.error);
        recoveryEmail = email;
        title.textContent = 'Nhập mã xác thực';
        description.textContent = 'Nhập mã gồm 6 chữ số được gửi đến email của bạn.';
        otpEntry.classList.remove('hidden', 'recovery-collapse');
        otpSuccess.classList.add('hidden');
        otpInputs.forEach(input => { input.value = ''; });
        resetOtpNotice();
        showStep(codeForm);
        startResendCooldown();
        otpInputs[0].focus();
    });

    resendButton.addEventListener('click', async () => {
        if (!recoveryEmail || resendButton.disabled) return;
        clearMessage();
        resendButton.disabled = true;
        resendButton.textContent = 'Đang gửi lại mã...';
        const sent = await window.SupabaseService.requestPasswordReset(recoveryEmail);
        if (!sent.success) {
            resendButton.disabled = false;
            resendButton.textContent = 'Gửi lại mã xác thực';
            return showMessage(sent.error);
        }
        otpInputs.forEach(input => { input.value = ''; });
        resetOtpNotice();
        startResendCooldown();
        otpInputs[0].focus();
    });

    codeForm.addEventListener('submit', async event => {
        event.preventDefault();
        clearMessage();
        const code = getOtp();
        if (!/^\d{6}$/.test(code)) return showOtpError('Vui lòng nhập đúng mã xác thực gồm 6 chữ số.');
        if (!recoveryEmail || !window.SupabaseService) return showOtpError('Phiên xác thực đã hết hạn. Vui lòng gửi lại mã.');
        const verified = await window.SupabaseService.verifyRecoveryOtp(recoveryEmail, code);
        if (!verified.success) return showOtpError(verified.error);
        showOtpVerified();
    });

    passwordForm.addEventListener('submit', async event => {
        event.preventDefault();
        clearMessage();
        const password = document.getElementById('recovery-new-password').value;
        const confirmation = document.getElementById('recovery-confirm-password').value;
        if (password.length < 6) return showMessage('Mật khẩu mới cần có ít nhất 6 ký tự.');
        if (password !== confirmation) return showMessage('Mật khẩu xác nhận không khớp.');
        const updated = await window.SupabaseService.updateAuthPassword(password);
        if (!updated) return showMessage('Không thể đổi mật khẩu. Vui lòng thử lại.');
        passwordForm.classList.add('recovery-collapse');
        window.setTimeout(() => {
            passwordForm.classList.add('hidden');
            title.textContent = 'Hoàn tất';
            description.textContent = '';
            backLink.classList.add('hidden');
            success.classList.remove('hidden');
            window.setTimeout(() => { window.location.href = 'homepage.html'; }, 2200);
        }, 260);
    });
});
