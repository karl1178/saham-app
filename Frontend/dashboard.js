document.addEventListener("DOMContentLoaded", async () => {
  // --- 1. PROTEKSI HALAMAN DARI PENYUSUP ---
  const isLoggedIn = localStorage.getItem("is_logged_in");
  const userEmail = localStorage.getItem("user_email");

  // Jika tidak ada tiket login, tendang ke halaman login
  if (isLoggedIn !== "true" || !userEmail) {
    alert("Akses Ditolak! Silakan login terlebih dahulu.");
    window.location.href = "login.html";
    return; // Hentikan semua script agar aman
  }

  // --- 2. INISIALISASI & PROTEKSI TOMBOL ADMIN ---
  const adminLink = document.getElementById("adminLink");

  if (adminLink) {
    // KUNCI 1: Paksa tombol sembunyi untuk SEMUA orang secara default
    adminLink.style.display = "none";
    adminLink.classList.add("d-none");

    // KUNCI 2: Buka gembok HANYA jika emailnya tepat admin@gmail.com
    if (userEmail === "karlferdinan1@gmail.com") {
      adminLink.style.display = "inline-flex"; // Gunakan inline-flex agar sejajar
      adminLink.classList.remove("d-none");
      console.log("Status: Admin VIP Dikenali. Tombol dimunculkan.");
    }
  }

  let favs = window.getFavorites ? window.getFavorites() : {};
  const stockListContainer = document.getElementById("stockListContainer");
  const dSearch = document.getElementById("desktopSearch");
  const mSearch = document.getElementById("mobileSearch");

  // --- 3. FUNGSI LOAD DATA IHSG (Dengan Parameter Range) ---
  async function loadIHSG(range = "1d") {
    try {
      // Tembak API beserta pilihan range-nya
      const response = await fetch(`http://127.0.0.1:8000/ihsg-data?range=${range}`);
      const data = await response.json();

      if (data.error) return;

      const priceEl = document.getElementById("ihsgPrice");
      const changeEl = document.getElementById("ihsgChange");

      if (priceEl) priceEl.innerText = data.price.toLocaleString("id-ID");

      if (changeEl) {
        const sign = data.change >= 0 ? "+" : "";
        changeEl.innerText = `${sign}${data.change} (${sign}${data.percent}%)`;
        changeEl.className = `badge ${data.change >= 0 ? "bg-success" : "bg-danger"}`;
      }

      // Render Chart Utama
      if (data.chart && data.labels) {
        renderIHSGMainChart(data.chart, data.labels, data.change >= 0);
      }
    } catch (e) {
      console.error("Gagal memuat data IHSG:", e);
    }
  }

  // --- 4. RENDER CHART UTAMA (Dengan Tanggal/Waktu) ---
  function renderIHSGMainChart(chartData, labelsData, isUp) {
    const canvas = document.getElementById("ihsgMainChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const color = isUp ? "#10b981" : "#ef4444";

    const existingChart = Chart.getChart("ihsgMainChart");
    if (existingChart) existingChart.destroy();

    new Chart(ctx, {
      type: "line",
      data: {
        labels: labelsData, // Sekarang pakai waktu asli dari Backend!
        datasets: [
          {
            data: chartData,
            borderColor: color,
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 6, // Titik muncul saat disorot mouse
            fill: true,
            backgroundColor: (context) => {
              const gradient = ctx.createLinearGradient(0, 0, 0, 220);
              gradient.addColorStop(0, isUp ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)");
              gradient.addColorStop(1, "transparent");
              return gradient;
            },
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              label: function (context) {
                return "Rp " + context.parsed.y.toLocaleString("id-ID");
              },
            },
          },
        },
        scales: {
          x: {
            display: true, // Tampilkan waktu di bawah grafik
            grid: { display: false },
            ticks: { color: "rgba(255,255,255,0.4)", maxTicksLimit: 6 }, // Batasi jumlah label agar tidak sesak
          },
          y: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "rgba(255,255,255,0.5)", font: { size: 10 } },
          },
        },
      },
    });
  }

  // EVENT LISTENER UNTUK TOMBOL TIMEFRAME
  document.querySelectorAll(".chart-filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // 1. Reset warna semua tombol
      document.querySelectorAll(".chart-filter-btn").forEach((b) => {
        b.classList.remove("text-primary", "fw-bold");
        b.classList.add("text-muted");
      });

      // 2. Warnai biru tombol yang diklik
      e.target.classList.remove("text-muted");
      e.target.classList.add("text-primary", "fw-bold");

      // 3. Ambil range dan panggil ulang data
      const selectedRange = e.target.dataset.range;
      loadIHSG(selectedRange);
    });
  });

  // Jalankan load IHSG saat startup (Default 1 Hari)
  loadIHSG("1d");

  // --- 5. LOGIKA DAFTAR SAHAM & SEARCH ---
  try {
    if (stockListContainer) {
      stockListContainer.innerHTML = '<p class="text-center py-4 text-muted">Memuat data dari server...</p>';
    }

    const response = await fetch("http://127.0.0.1:8000/daftar-saham");
    const dbSaham = await response.json();

    let stocksArray = dbSaham.map((saham) => {
      return {
        code: saham.ticker,
        name: saham.nama_emiten || "Perusahaan Terbuka",
        color: "#10b981",
        change: "Analisis",
        favState: favs[saham.ticker] || 0,
      };
    });

    stocksArray.sort((a, b) => b.favState - a.favState);

    function renderList(list) {
      if (!stockListContainer) return;
      stockListContainer.innerHTML = "";

      if (list.length === 0) {
        stockListContainer.innerHTML = '<p class="text-muted text-center py-4">Saham tidak ditemukan.</p>';
        return;
      }

      list.forEach((stock) => {
        let favIconClass = "fa-regular fa-star";
        if (stock.favState === 1) favIconClass = "fa-solid fa-star-half-stroke";
        if (stock.favState === 2) favIconClass = "fa-solid fa-star";

        const stockHTML = `
          <a href="detail.html?code=${stock.code}" class="stock-item text-decoration-none">
            <div class="d-flex align-items-center">
              <div class="stock-icon m-0 me-3" style="background-color: ${stock.color}40; color: ${stock.color}; border: 1px solid ${stock.color}80; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-weight: bold;">
                ${stock.code.charAt(0)}
              </div>
              <div class="stock-info">
                <div class="d-flex align-items-center gap-2">
                  <h6 class="stock-code mb-0" style="color: white;">${stock.code}</h6>
                  ${stock.favState !== 0 ? `<i class="${favIconClass} favorite-icon m-0 text-warning"></i>` : ""}
                </div>
                <p class="stock-company text-muted mb-0" style="font-size: 0.8rem;">${stock.name}</p>
              </div>
            </div>
            <div class="stock-price-info text-end">
              <span class="badge bg-primary px-3 py-2 rounded">${stock.change}</span>
            </div>
          </a>
          <hr style="border-color: #333; margin: 10px 0;">
        `;
        stockListContainer.innerHTML += stockHTML;
      });
    }

    renderList(stocksArray);

    function applySearch(e) {
      const term = e.target.value.toLowerCase();
      if (e.target.id === "desktopSearch" && mSearch) mSearch.value = e.target.value;
      if (e.target.id === "mobileSearch" && dSearch) dSearch.value = e.target.value;

      const filtered = stocksArray.filter((s) => s.code.toLowerCase().includes(term) || s.name.toLowerCase().includes(term));
      renderList(filtered);
    }

    if (dSearch) dSearch.addEventListener("input", applySearch);
    if (mSearch) mSearch.addEventListener("input", applySearch);
  } catch (error) {
    console.error("Gagal load data list saham:", error);
    if (stockListContainer) {
      stockListContainer.innerHTML = '<p class="text-danger text-center py-4">Gagal terhubung ke Database Backend.</p>';
    }
  }

  // --- 6. LOGIKA LOGOUT YANG BENAR ---
  const logoutBtn = document.querySelector(".logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();

      // Hapus data sesi dengan Key yang BENAR
      localStorage.removeItem("is_logged_in");
      localStorage.removeItem("user_email");

      logoutBtn.innerHTML = '<i class="fa fa-spinner fa-spin text-danger"></i>';

      setTimeout(() => {
        window.location.href = "login.html";
      }, 800);
    });
  }
});
