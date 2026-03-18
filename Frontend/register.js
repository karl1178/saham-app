document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");
  const sendOtpBtn = document.getElementById("sendOtpBtn");
  const otpWrapper = document.getElementById("otpWrapper");
  const otpCodeInput = document.getElementById("otpCode");
  const registerBtn = document.getElementById("registerBtn");

  // Fungsi validasi email
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validateInputs() {
    const isOk = isValidEmail(emailInput.value) && passwordInput.value.length >= 6 && passwordInput.value === confirmPassword.value;
    sendOtpBtn.disabled = !isOk;
  }

  [emailInput, passwordInput, confirmPassword].forEach((i) => i.addEventListener("input", validateInputs));

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
