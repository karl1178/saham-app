document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    let isValid = true;

    // Reset states
    emailInput.classList.remove("is-invalid");
    passwordInput.classList.remove("is-invalid");

    const emailVal = emailInput.value.trim();
    const pwdVal = passwordInput.value.trim();

    // Email validation
    if (!emailVal || !isValidEmail(emailVal)) {
      emailInput.classList.add("is-invalid");
      isValid = false;
    }

    // Password validation
    if (!pwdVal) {
      passwordInput.classList.add("is-invalid");
      isValid = false;
    }

    if (isValid) {
      // Simpan Session User ---
      const userSession = {
        email: emailVal,
        loginTime: new Date().getTime(),
      };
      localStorage.setItem("user", JSON.stringify(userSession));
      // ----------------------------------------------

      // Dummy login check for admin
      if (emailVal === "admin@gmail.com" && pwdVal === "admin123") {
        const btn = loginForm.querySelector('button[type="submit"]');
        btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Logging in...';
        btn.disabled = true;

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
        return;
      }

      // Regular successful form submission
      const btn = loginForm.querySelector('button[type="submit"]');
      btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Logging in...';
      btn.disabled = true;

      setTimeout(() => {
        window.location.href = "dashboard.html"; // Ubah ke dashboard agar seragam
      }, 1000);
    }
  });

  // Realtime validation UX
  emailInput.addEventListener("input", () => {
    if (isValidEmail(emailInput.value.trim())) {
      emailInput.classList.remove("is-invalid");
    }
  });

  passwordInput.addEventListener("input", () => {
    if (passwordInput.value.trim() !== "") {
      passwordInput.classList.remove("is-invalid");
    }
  });
});
