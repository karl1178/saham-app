document.addEventListener("DOMContentLoaded", async () => {
  // --- 1. INISIALISASI & PROTEKSI ADMIN ---
  const user = JSON.parse(localStorage.getItem("user"));
  const adminLink = document.getElementById("adminLink");

  // Logika Munculkan Tombol Admin
  if (user && user.email === "admin@gmail.com") {
    if (adminLink) {
      adminLink.classList.remove("d-none");
      console.log("Admin akses diberikan.");
    }
  }

  let favs = window.getFavorites ? window.getFavorites() : {};
  const stockListContainer = document.getElementById("stockListContainer");
  const dSearch = document.getElementById("desktopSearch");
  const mSearch = document.getElementById("mobileSearch");

  // --- 2. FUNGSI LOAD DATA IHSG ---
  async function loadIHSG() {
    try {
      const response = await fetch("http://127.0.0.1:8000/ihsg-data");
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

      // Render Chart Utama (Besar)
      if (data.chart) {
        renderIHSGMainChart(data.chart, data.change >= 0);
      }
    } catch (e) {
      console.error("Gagal memuat data IHSG:", e);
    }
  }

  // --- 3. RENDER CHART UTAMA (BESAR) ---
  function renderIHSGMainChart(chartData, isUp) {
    const canvas = document.getElementById("ihsgMainChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const color = isUp ? "#10b981" : "#ef4444";

    const existingChart = Chart.getChart("ihsgMainChart");
    if (existingChart) existingChart.destroy();

    new Chart(ctx, {
      type: "line",
      data: {
        labels: chartData.map((_, i) => i),
        datasets: [
          {
            data: chartData,
            borderColor: color,
            borderWidth: 3,
            pointRadius: 0,
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
        },
        scales: {
          x: { display: false },
          y: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "rgba(255,255,255,0.5)", font: { size: 10 } },
          },
        },
      },
    });
  }

  // Jalankan load IHSG saat startup
  loadIHSG();

  // --- 4. LOGIKA DAFTAR SAHAM & SEARCH ---
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

  // --- LOGIKA LOGOUT ---
  const logoutBtn = document.querySelector(".logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault(); // Mencegah pindah halaman instan

      // Hapus data user dari localStorage
      localStorage.removeItem("user");

      // Beri efek loading sebentar biar keren
      logoutBtn.innerHTML = '<i class="fa fa-spinner fa-spin text-danger"></i>';

      setTimeout(() => {
        window.location.href = "login.html"; // Lempar balik ke login
      }, 800);
    });
  }
});
