document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const username = document.getElementById('username');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const otpWrapper = document.getElementById('otpWrapper');
    const otpCode = document.getElementById('otpCode');
    const registerBtn = document.getElementById('registerBtn');
    const otpHelpText = document.getElementById('otpHelpText');

    let isOtpSent = false;
    let isOtpVerified = false;

    function checkFormValidity() {
        const uVal = username.value.trim();
        const eVal = email.value.trim();
        const pVal = password.value;
        const cpVal = confirmPassword.value;

        let emailValid = isValidEmail(eVal);
        let passwordValid = pVal.length >= 6;
        let matchValid = pVal === cpVal && pVal !== '';
        
        // Show/hide feedback visually
        if(eVal !== '' && !emailValid) {
            email.classList.add('is-invalid');
        } else {
            email.classList.remove('is-invalid');
        }

        if(cpVal !== '' && !matchValid) {
            confirmPassword.classList.add('is-invalid');
        } else {
            confirmPassword.classList.remove('is-invalid');
        }

        const canSendOtp = uVal !== '' && emailValid && passwordValid && matchValid;

        if (!isOtpSent) {
            sendOtpBtn.disabled = !canSendOtp;
            if (canSendOtp) {
                otpHelpText.innerText = "All rules met. You can now send an OTP.";
                otpHelpText.classList.add("text-success");
                otpHelpText.classList.remove("text-muted");
            } else {
                otpHelpText.innerText = "Please fill all fields correctly to send OTP.";
                otpHelpText.classList.remove("text-success");
                otpHelpText.classList.add("text-muted");
            }
        }
    }

    // Attach listeners
    const inputs = [username, email, password, confirmPassword];
    inputs.forEach(input => {
        input.addEventListener('input', checkFormValidity);
    });

    // Send OTP logic
    sendOtpBtn.addEventListener('click', () => {
        sendOtpBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Sending...';
        sendOtpBtn.disabled = true;

        setTimeout(() => {
            isOtpSent = true;
            sendOtpBtn.innerText = "OTP Sent!";
            sendOtpBtn.classList.replace('btn-custom-outline', 'btn-success');
            
            // Show OTP section (simulating collapse behavior)
            otpWrapper.classList.remove('collapse');
            otpWrapper.classList.add('show');
            
            otpHelpText.innerText = "Please check your email for the 4-digit code.";

            // Lock upper inputs
            inputs.forEach(input => input.readOnly = true);

        }, 1000);
    });

    // Validasi OTP realtime untuk sign up
    otpCode.addEventListener('input', () => {
        if(otpCode.value.length === 4 && isOtpSent) {
            registerBtn.disabled = false;
        } else {
            registerBtn.disabled = true;
        }
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (otpCode.value === '1234') { 
            // example real verification logic
        }

        registerBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Creating account...';
        registerBtn.disabled = true;

        setTimeout(() => {
            alert("Account successfully created! Please log in.");
            window.location.href = "login.html";
        }, 1500);
    });
});
