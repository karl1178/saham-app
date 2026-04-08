document.addEventListener("DOMContentLoaded", () => {
  let currentStep = 1; // 1: Email, 2: OTP, 3: New Password
  let userEmail = ""; // Simpan email sementara
  let userOTP = ""; // Simpan OTP sementara

  const form = document.getElementById("forgotForm");
  const stepDesc = document.getElementById("stepDescription");
  const btn = document.getElementById("submitBtn");

  // Steps containers
  const stepEmail = document.getElementById("stepEmail");
  const stepOTP = document.getElementById("stepOTP");
  const stepNewPwd = document.getElementById("stepNewPwd");

  // Inputs
  const recoveryEmail = document.getElementById("recoveryEmail");
  const otpCode = document.getElementById("otpCode");
  const newPassword = document.getElementById("newPassword");
  const confirmPassword = document.getElementById("confirmPassword");
  const pwdMatchError = document.getElementById("pwdMatchError");

  // Mencegah form me-refresh halaman dan mengarahkan ke step yang benar
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      if (currentStep === 1) {
        handleEmailStep();
      } else if (currentStep === 2) {
        handleOTPStep();
      } else if (currentStep === 3) {
        handleResetStep();
      }
    });
  }

  // --- STEP 1: KIRIM EMAIL OTP KE BACKEND ---
  async function handleEmailStep() {
    recoveryEmail.classList.remove("is-invalid");
    const email = recoveryEmail.value.trim();

    // Validasi format email menggunakan fungsi dari script.js
    if (typeof isValidEmail === "function" && !isValidEmail(email)) {
      recoveryEmail.classList.add("is-invalid");
      return;
    }

    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Sending OTP...';
    btn.disabled = true;

    try {
      const response = await fetch("http://127.0.0.1:8000/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      });
      const data = await response.json();

      if (response.ok) {
        userEmail = email; // Simpan email untuk step 3
        currentStep = 2;
        stepEmail.classList.add("d-none");
        stepOTP.classList.remove("d-none");
        stepDesc.innerText = `We've sent a 6-digit code to ${email}.`;
        btn.innerHTML = "Verify OTP";
      } else {
        alert("Gagal: " + (data.detail || "Email tidak ditemukan."));
      }
    } catch (error) {
      console.error("Error Step 1:", error);
      alert("Koneksi ke server gagal. Pastikan Uvicorn menyala!");
    }
    btn.disabled = false;
  }

  // --- STEP 2: CEK OTP KE BACKEND SECARA REAL-TIME ---
  async function handleOTPStep() {
    otpCode.classList.remove("is-invalid");
    const otp = otpCode.value.trim();

    if (otp.length < 6) {
      // Validasi 6 digit
      otpCode.classList.add("is-invalid");
      return;
    }

    // Ubah tombol jadi loading
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Verifying...';
    btn.disabled = true;

    try {
      // Tembak API baru untuk ngecek keaslian OTP
      const response = await fetch("http://127.0.0.1:8000/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, otp: otp }),
      });

      if (response.ok) {
        // JIKA OTP BENAR: Lolos ke Step 3 (Password Baru)
        userOTP = otp;
        currentStep = 3;
        stepOTP.classList.add("d-none");
        stepNewPwd.classList.remove("d-none");
        stepDesc.innerText = "Create a new strong password.";
        btn.innerHTML = "Reset Password";
      } else {
        // JIKA OTP SALAH: Tolak dan munculkan error!
        const data = await response.json();
        alert("Gagal: " + (data.detail || "Kode OTP salah."));
        otpCode.classList.add("is-invalid");
      }
    } catch (error) {
      console.error("Error Step 2:", error);
      alert("Koneksi ke server gagal.");
    }

    btn.disabled = false;
  }

  // --- STEP 3: EKSEKUSI RESET PASSWORD DI BACKEND ---
  async function handleResetStep() {
    newPassword.classList.remove("is-invalid");
    confirmPassword.classList.remove("is-invalid");
    pwdMatchError.style.display = "none";

    const np = newPassword.value;
    const cp = confirmPassword.value;

    if (np.length < 8) {
      newPassword.classList.add("is-invalid");
      return;
    }

    if (np !== cp) {
      confirmPassword.classList.add("is-invalid");
      pwdMatchError.innerText = "Passwords do not match.";
      pwdMatchError.style.display = "block";
      return;
    }

    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    try {
      const response = await fetch("http://127.0.0.1:8000/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          otp: userOTP,
          new_password: np,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Password successfully reset! Please log in with your new password.");
        window.location.href = "login.html";
      } else {
        alert("Gagal Reset: " + (data.detail || "Terjadi kesalahan."));

        // Jika server tiba-tiba menolak OTP di tahap akhir
        if (data.detail && data.detail.includes("OTP")) {
          currentStep = 2;
          stepNewPwd.classList.add("d-none");
          stepOTP.classList.remove("d-none");
          btn.innerHTML = "Verify OTP";
          otpCode.value = "";
          otpCode.classList.add("is-invalid");
        }
      }
    } catch (error) {
      console.error("Error Step 3:", error);
      alert("Koneksi ke server gagal.");
    }
    btn.disabled = false;
  }

  // --- REAL-TIME VALIDATIONS ---
  if (recoveryEmail) {
    recoveryEmail.addEventListener("input", () => {
      if (typeof isValidEmail === "function" && isValidEmail(recoveryEmail.value)) {
        recoveryEmail.classList.remove("is-invalid");
      }
    });
  }
  if (otpCode) {
    otpCode.addEventListener("input", () => {
      if (otpCode.value.length === 6) otpCode.classList.remove("is-invalid");
    });
  }
  [newPassword, confirmPassword].forEach((input) => {
    if (input) {
      input.addEventListener("input", () => {
        input.classList.remove("is-invalid");
        if (pwdMatchError) pwdMatchError.style.display = "none";
      });
    }
  });

  // --- TOGGLE PASSWORD VISIBILITY ---
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
