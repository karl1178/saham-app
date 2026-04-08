document.addEventListener("DOMContentLoaded", () => {
  // alert("HALO! JS YANG BARU SUDAH JALAN!"); ini debug

  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");

  // Tangkap elemen tombol mata (eye icon)
  const togglePasswordBtn = document.getElementById("togglePasswordBtn");

  // Kunci form agar tidak bisa refresh otomatis
  if (loginForm) {
    loginForm.onsubmit = (e) => {
      e.preventDefault();
      return false;
    };
  }

  // --- FITUR SHOW/HIDE PASSWORD ---
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener("click", () => {
      const icon = togglePasswordBtn.querySelector("i");

      // Cek tipe input saat ini
      if (passwordInput.type === "password") {
        passwordInput.type = "text"; // Tampilkan password
        icon.classList.replace("fa-eye-slash", "fa-eye"); // Ganti ikon
      } else {
        passwordInput.type = "password"; // Sembunyikan password
        icon.classList.replace("fa-eye", "fa-eye-slash"); // Ganti ikon kembali
      }
    });
  }

  // --- FITUR LOGIN (TEMBAK API) ---
  if (loginBtn) {
    loginBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const emailVal = emailInput.value.trim();
      const passwordVal = passwordInput.value;

      // Validasi input kosong
      if (!emailVal || !passwordVal) {
        alert("Harap isi email dan password!");
        return;
      }

      // Ubah tombol jadi loading
      const originalText = loginBtn.innerText;
      loginBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Memeriksa...';
      loginBtn.disabled = true;

      try {
        // Tembak API Backend
        const response = await fetch("http://127.0.0.1:8000/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailVal,
            password: passwordVal,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          // LOGIN BERHASIL
          localStorage.setItem("user_email", data.email);
          localStorage.setItem("is_logged_in", "true");

          // Pindah ke halaman utama/dashboard
          window.location.href = "dashboard.html";
        } else {
          // LOGIN GAGAL (Salah password atau belum aktif)
          alert("Gagal Login: " + (data.detail || "Terjadi kesalahan."));

          // Jika errornya karena belum aktif
          if (data.detail && data.detail.includes("belum aktif")) {
            localStorage.setItem("pending_email", emailVal);
            // window.location.href = "register.html"; // Aktifkan jika mau dilempar ke register lagi
          }

          loginBtn.innerHTML = originalText;
          loginBtn.disabled = false;
        }
      } catch (error) {
        console.error("Login Error:", error);
        alert("Tidak bisa terhubung ke server. Pastikan Uvicorn jalan!");
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
      }
    });
  }
});
