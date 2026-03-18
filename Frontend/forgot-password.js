document.addEventListener('DOMContentLoaded', () => {
    let currentStep = 1; // 1: Email, 2: OTP, 3: New Password

    const form = document.getElementById('forgotForm');
    const stepDesc = document.getElementById('stepDescription');
    const btn = document.getElementById('submitBtn');

    // Steps containers
    const stepEmail = document.getElementById('stepEmail');
    const stepOTP = document.getElementById('stepOTP');
    const stepNewPwd = document.getElementById('stepNewPwd');

    // Inputs
    const recoveryEmail = document.getElementById('recoveryEmail');
    const otpCode = document.getElementById('otpCode');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const pwdMatchError = document.getElementById('pwdMatchError');

    // Dummy old password check
    const DUMMY_OLD_PASSWORD = "password123";

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (currentStep === 1) {
            handleEmailStep();
        } else if (currentStep === 2) {
            handleOTPStep();
        } else if (currentStep === 3) {
            handleResetStep();
        }
    });

    function handleEmailStep() {
        recoveryEmail.classList.remove('is-invalid');
        const email = recoveryEmail.value.trim();

        if (!isValidEmail(email)) {
            recoveryEmail.classList.add('is-invalid');
            return;
        }

        // Simulate API call to send OTP
        btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Sending...';
        btn.disabled = true;

        setTimeout(() => {
            currentStep = 2;
            stepEmail.classList.add('d-none');
            stepOTP.classList.remove('d-none');
            stepDesc.innerText = `We've sent a 4-digit code to ${email}.`;
            btn.innerHTML = 'Verify OTP';
            btn.disabled = false;
        }, 800);
    }

    function handleOTPStep() {
        otpCode.classList.remove('is-invalid');
        const otp = otpCode.value.trim();

        if (otp.length < 4) {
            otpCode.classList.add('is-invalid');
            return;
        }

        btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Verifying...';
        btn.disabled = true;

        setTimeout(() => {
            currentStep = 3;
            stepOTP.classList.add('d-none');
            stepNewPwd.classList.remove('d-none');
            stepDesc.innerText = "Create a new strong password.";
            btn.innerHTML = 'Reset Password';
            btn.disabled = false;
        }, 800);
    }

    function handleResetStep() {
        newPassword.classList.remove('is-invalid');
        confirmPassword.classList.remove('is-invalid');
        pwdMatchError.style.display = 'none';

        const np = newPassword.value;
        const cp = confirmPassword.value;

        if (np.length < 8) {
            newPassword.classList.add('is-invalid');
            return;
        }

        if (np !== cp) {
            confirmPassword.classList.add('is-invalid');
            pwdMatchError.innerText = "Passwords do not match.";
            pwdMatchError.style.display = 'block';
            return;
        }

        // Logic dummy: password baru tidak boleh sama dengan yg lama
        if (np === DUMMY_OLD_PASSWORD) {
            newPassword.classList.add('is-invalid');
            confirmPassword.classList.add('is-invalid');
            pwdMatchError.innerText = "New password cannot be the same as your old password.";
            pwdMatchError.style.display = 'block';
            return;
        }

        btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        setTimeout(() => {
            alert("Password successfully reset! Please log in.");
            window.location.href = "login.html";
        }, 1000);
    }

    // Real-time validations
    recoveryEmail.addEventListener('input', () => {
        if(isValidEmail(recoveryEmail.value)) recoveryEmail.classList.remove('is-invalid');
    });
    otpCode.addEventListener('input', () => {
        if(otpCode.value.length === 4) otpCode.classList.remove('is-invalid');
    });
    [newPassword, confirmPassword].forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('is-invalid');
            pwdMatchError.style.display = 'none';
        });
    });

    // Toggle Password Visibility
    function setupToggle(btnId, inputId) {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (btn && input) {
            btn.addEventListener("click", function () {
                const type = input.getAttribute("type") === "password" ? "text" : "password";
                input.setAttribute("type", type);
                const icon = this.querySelector("i");
                icon.classList.toggle("fa-eye");
                icon.classList.toggle("fa-eye-slash");
            });
        }
    }

    setupToggle("toggleNewPasswordBtn", "newPassword");
    setupToggle("toggleConfirmPasswordBtn", "confirmPassword");
});
