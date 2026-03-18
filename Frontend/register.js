document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");
  const sendOtpBtn = document.getElementById("sendOtpBtn");
  const otpWrapper = document.getElementById("otpWrapper");
  const otpCodeInput = document.getElementById("otpCode");
  const registerBtn = document.getElementById("registerBtn");

  const usernameInput = document.getElementById("username");

  // Fungsi validasi email
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function checkUsername() {
    if (usernameInput.value.trim() === "") {
      usernameInput.classList.add("is-invalid");
      return false;
    } else {
      usernameInput.classList.remove("is-invalid");
      return true;
    }
  }

  function checkEmail() {
    if (!isValidEmail(emailInput.value.trim())) {
      emailInput.classList.add("is-invalid");
      return false;
    } else {
      emailInput.classList.remove("is-invalid");
      return true;
    }
  }

  function checkPassword() {
    if (passwordInput.value.length < 8) {
      passwordInput.classList.add("is-invalid");
      return false;
    } else {
      passwordInput.classList.remove("is-invalid");
      return true;
    }
  }

  function checkConfirmPassword() {
    if (confirmPassword.value !== passwordInput.value || confirmPassword.value === "") {
      confirmPassword.classList.add("is-invalid");
      return false;
    } else {
      confirmPassword.classList.remove("is-invalid");
      return true;
    }
  }

  function validateInputs() {
    const uOk = usernameInput.value.trim() !== "";
    const eOk = isValidEmail(emailInput.value.trim());
    const pOk = passwordInput.value.length >= 8;
    const cpOk = confirmPassword.value === passwordInput.value && confirmPassword.value !== "";
    sendOtpBtn.disabled = !(uOk && eOk && pOk && cpOk);
  }

  [usernameInput, emailInput, passwordInput, confirmPassword].forEach((i) => {
    i.addEventListener("input", validateInputs);
  });

  usernameInput.addEventListener("input", checkUsername);
  usernameInput.addEventListener("blur", checkUsername);
  emailInput.addEventListener("input", checkEmail);
  emailInput.addEventListener("blur", checkEmail);
  passwordInput.addEventListener("input", () => { checkPassword(); if (confirmPassword.value) checkConfirmPassword(); });
  passwordInput.addEventListener("blur", checkPassword);
  confirmPassword.addEventListener("input", checkConfirmPassword);
  confirmPassword.addEventListener("blur", checkConfirmPassword);

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

  setupToggle("togglePasswordBtn", "password");
  setupToggle("toggleConfirmPasswordBtn", "confirmPassword");

  // --- 1. PROSES KIRIM OTP ---
  sendOtpBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    sendOtpBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Sending...';
    sendOtpBtn.disabled = true;

    try {
      const response = await fetch("http://127.0.0.1:8000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.value, password: passwordInput.value }),
      });

      if (response.ok) {
        localStorage.setItem("pending_email", emailInput.value);

        // MUNCULKAN TEMPAT OTP
        otpWrapper.classList.add("show"); // Paksa muncul
        sendOtpBtn.innerText = "OTP Sent!";
        sendOtpBtn.className = "btn btn-success w-100 mb-3";

        // Lock input agar tidak berubah
        [emailInput, passwordInput, confirmPassword].forEach((i) => (i.readOnly = true));
      } else {
        const data = await response.json();
        alert(data.detail || "Gagal kirim OTP");
        sendOtpBtn.disabled = false;
        sendOtpBtn.innerText = "Send OTP to Email";
      }
    } catch (error) {
      alert("Koneksi ke server gagal!");
      sendOtpBtn.disabled = false;
    }
  });

  // Aktifkan tombol daftar jika OTP 6 digit
  otpCodeInput.addEventListener("input", () => {
    registerBtn.disabled = otpCodeInput.value.length < 6;
  });

  // --- 2. PROSES VERIFIKASI ---
  registerBtn.addEventListener("click", async () => {
    registerBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Verifying...';
    registerBtn.disabled = true;

    try {
      const response = await fetch("http://127.0.0.1:8000/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: localStorage.getItem("pending_email"),
          otp: otpCodeInput.value.trim(),
        }),
      });

      if (response.ok) {
        alert("Akun Aktif! Silakan Login.");
        window.location.href = "login.html";
      } else {
        const data = await response.json();
        alert(data.detail || "OTP Salah");
        registerBtn.disabled = false;
        registerBtn.innerText = "Sign Up & Verify";
      }
    } catch (err) {
      alert("Kesalahan koneksi.");
      registerBtn.disabled = false;
    }
  });
});
