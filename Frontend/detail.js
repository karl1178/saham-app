document.addEventListener("DOMContentLoaded", async () => {
  // 1. Inisialisasi Elemen UI
  const favStar = document.getElementById("favStar");
  const stockCodeEl = document.getElementById("stockCode");
  const stockNameEl = document.getElementById("stockName");
  const stockNameMobileEl = document.getElementById("stockNameMobile");
  const stockPriceEl = document.getElementById("stockPrice");
  const stockChangeBadge = document.getElementById("stockChangeBadge");

  const hargaWajarEl = document.getElementById("hargaWajar");
  const mosValueEl = document.getElementById("mosValue");

  const statNetIncome = document.getElementById("statNetIncome");
  const statFCF = document.getElementById("statFCF");
  const statGrowth = document.getElementById("statGrowth");
  const statYear = document.getElementById("statYear");

  // === ELEMEN BARU: Sektor & Shares ===
  const statSektor = document.getElementById("statSektor");
  const statShares = document.getElementById("statShares");

  const badgeShort = document.getElementById("badgeShort");
  const badgeMid = document.getElementById("badgeMid");
  const badgeLong = document.getElementById("badgeLong");

  const urlParams = new URLSearchParams(window.location.search);
  const code = (urlParams.get("code") || "BBCA").toUpperCase();

  // --- 2. LOAD DATA FUNDAMENTAL & REKOMENDASI ---
  // Shares sekarang diambil dari DB via API, tidak perlu sharesMap hardcode
  async function loadFundamental() {
    try {
      stockPriceEl.innerText = "Loading...";

      // Tidak perlu kirim shares sebagai query param — backend ambil dari DB
      const response = await fetch(`http://127.0.0.1:8000/rekomendasi/${code}?horizon=mid`);
      const data = await response.json();

      if (data.error) {
        alert("Data fundamental tidak ditemukan: " + data.error);
        stockPriceEl.innerText = "N/A";
        return;
      }

      const an = data.analisis;
      const raw = data.fundamental_raw;

      // Header Info
      stockCodeEl.innerText = data.ticker;
      stockNameEl.innerText = data.name;
      if (stockNameMobileEl) stockNameMobileEl.innerText = data.name;

      // Harga real-time
      stockPriceEl.innerText = an.harga_pasar_saat_ini ? "Rp " + an.harga_pasar_saat_ini.toLocaleString("id-ID") : "N/A";

      // Badge Utama (Header)
      stockChangeBadge.innerText = an.rekomendasi_akhir;
      updateBadgeStyle(stockChangeBadge, an.rekomendasi_akhir);

      // Valuasi Hybrid
      hargaWajarEl.innerText = "Rp " + an.harga_wajar_hybrid.toLocaleString("id-ID");
      mosValueEl.innerText = an.margin_of_safety;

      // Fundamental Stats
      statNetIncome.innerText = "Rp " + raw.net_income.toLocaleString("id-ID");
      statFCF.innerText = "Rp " + raw.fcf.toLocaleString("id-ID");
      statGrowth.innerText = an.growth_digunakan;
      statYear.innerText = raw.year;

      // === TAMPILKAN SEKTOR & SHARES (jika elemennya ada di HTML) ===
      if (statSektor) statSektor.innerText = data.sektor || "-";
      if (statShares) statShares.innerText = data.shares ? data.shares.toLocaleString("id-ID") : "-";

      // Tabel Rekomendasi (Short, Mid, Long)
      [badgeShort, badgeMid, badgeLong].forEach((badge) => {
        if (badge) {
          badge.innerText = an.rekomendasi_akhir;
          updateBadgeStyle(badge, an.rekomendasi_akhir, true);
        }
      });
    } catch (error) {
      console.error("Gagal konek ke backend fundamental:", error);
      stockPriceEl.innerText = "Backend Offline";
    }
  }

  // --- 3. LOAD DATA GRAFIK REAL-TIME ---
  async function loadChartData(range = "1d") {
    try {
      const response = await fetch(`http://127.0.0.1:8000/chart/${code}?range=${range}`);
      const data = await response.json();

      if (data.error) {
        console.error("Grafik Error:", data.error);
        return;
      }

      const isUp = data.change >= 0;
      renderChart(data.chart, data.labels, isUp);
    } catch (error) {
      console.error("Gagal load grafik saham:", error);
    }
  }

  loadFundamental();
  loadChartData("1d");

  // --- 4. EVENT LISTENER TOMBOL TIMEFRAME ---
  document.querySelectorAll(".chart-filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".chart-filter-btn").forEach((b) => {
        b.classList.remove("text-primary", "fw-bold");
        b.classList.add("text-muted");
      });
      e.target.classList.remove("text-muted");
      e.target.classList.add("text-primary", "fw-bold");
      loadChartData(e.target.dataset.range);
    });
  });

  // --- 5. FUNGSI HELPER UI ---
  function updateBadgeStyle(el, rekomendasi, isTable = false) {
    el.className = isTable ? "recommendation-badge" : "badge px-3 py-1";
    if (rekomendasi === "BUY") {
      el.classList.add(isTable ? "badge-buy" : "bg-success");
    } else if (rekomendasi === "SELL") {
      el.classList.add(isTable ? "badge-sell" : "bg-danger");
    } else {
      el.classList.add("bg-warning", "text-dark");
    }
  }

  function renderChart(chartData, labelsData, isUp) {
    const ctx = document.getElementById("detailChart").getContext("2d");
    const chartColor = isUp ? "#10b981" : "#ef4444";
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, `${chartColor}40`);
    gradient.addColorStop(1, `${chartColor}00`);

    const existingChart = Chart.getChart("detailChart");
    if (existingChart) existingChart.destroy();

    new Chart(ctx, {
      type: "line",
      data: {
        labels: labelsData,
        datasets: [
          {
            label: code,
            data: chartData,
            borderColor: chartColor,
            backgroundColor: gradient,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 6,
            fill: true,
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
            display: true,
            grid: { display: false },
            ticks: { color: "rgba(255,255,255,0.4)", maxTicksLimit: 6 },
          },
          y: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "rgba(255,255,255,0.5)" },
          },
        },
      },
    });
  }

  // --- 6. LOGIKA FAVORITE ---
  const favs = window.getFavorites ? window.getFavorites() : {};
  let favState = favs[code] || 0;

  const updateFavIcon = () => {
    favStar.className = "fa-star fs-3 fav-icon-toggle";
    if (favState === 0) favStar.classList.add("fa-regular");
    else if (favState === 1) favStar.classList.add("fa-solid", "fa-star-half-stroke");
    else if (favState === 2) favStar.classList.add("fa-solid");
  };

  updateFavIcon();
  favStar.addEventListener("click", () => {
    favState = (favState + 1) % 3;
    updateFavIcon();
    if (window.setFavorite) window.setFavorite(code, favState);
  });
});
