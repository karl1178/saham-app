document.addEventListener("DOMContentLoaded", async () => {
  // --- 1. PENJAGA PINTU VIP ---
  const userEmail = localStorage.getItem("user_email");
  if (userEmail !== "karlferdinan1@gmail.com") {
    alert("Akses Ilegal! Anda bukan Admin.");
    window.location.href = "dashboard.html";
    return;
  }

  // ============================================================
  // BAGIAN A: KELOLA LAPORAN KEUANGAN (Kode Lama, Tidak Berubah)
  // ============================================================

  const tickerSelect = document.getElementById("tickerSelect");
  const reportTableBody = document.getElementById("reportTableBody");
  const saveReportBtn = document.getElementById("saveReportBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const formTitle = document.getElementById("formTitle");

  const inputYear = document.getElementById("inputYear");
  const inputNetIncome = document.getElementById("inputNetIncome");
  const inputFCF = document.getElementById("inputFCF");
  const editReportId = document.getElementById("editReportId");

  async function loadTickers() {
    try {
      const response = await fetch("http://127.0.0.1:8000/daftar-saham");
      const data = await response.json();

      tickerSelect.style.color = "white";
      tickerSelect.style.backgroundColor = "#212529";
      tickerSelect.innerHTML = '<option value="" style="color: white; background-color: #212529;">-- Pilih Ticker Saham --</option>';

      data.forEach((saham) => {
        tickerSelect.innerHTML += `
          <option value="${saham.ticker}" style="color: white; background-color: #212529;">
            ${saham.ticker} - ${saham.nama_emiten}
          </option>`;
      });
    } catch (error) {
      console.error("Gagal load ticker:", error);
    }
  }
  loadTickers();

  tickerSelect.addEventListener("change", async () => {
    resetForm();
    const ticker = tickerSelect.value;
    if (!ticker) {
      reportTableBody.innerHTML = '<tr><td colspan="4" class="text-muted">Pilih ticker untuk melihat data.</td></tr>';
      return;
    }

    reportTableBody.innerHTML = '<tr><td colspan="4"><i class="fa fa-spinner fa-spin"></i> Memuat...</td></tr>';

    try {
      const response = await fetch(`http://127.0.0.1:8000/laporan/${ticker}`);
      if (!response.ok) throw new Error("Gagal ambil data");
      const reports = await response.json();

      if (reports.length === 0) {
        reportTableBody.innerHTML = '<tr><td colspan="4" class="text-warning">Belum ada laporan untuk ticker ini.</td></tr>';
        return;
      }

      reportTableBody.innerHTML = "";
      reports.forEach((r) => {
        reportTableBody.innerHTML += `
          <tr>
            <td class="fw-bold">${r.year}</td>
            <td>${r.net_income.toLocaleString("id-ID")}</td>
            <td>${r.fcf.toLocaleString("id-ID")}</td>
            <td>
              <button class="btn btn-sm btn-warning edit-btn" data-id="${r.id}" data-year="${r.year}" data-ni="${r.net_income}" data-fcf="${r.fcf}"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-sm btn-danger delete-btn" data-id="${r.id}"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>`;
      });

      pasangEventTombol();
    } catch (error) {
      reportTableBody.innerHTML = '<tr><td colspan="4" class="text-danger">Terjadi kesalahan koneksi.</td></tr>';
    }
  });

  function pasangEventTombol() {
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget;
        formTitle.innerText = "Edit Laporan (ID: " + target.dataset.id + ")";
        formTitle.className = "text-warning mb-3";
        editReportId.value = target.dataset.id;
        inputYear.value = target.dataset.year;
        inputNetIncome.value = target.dataset.ni;
        inputFCF.value = target.dataset.fcf;
        inputYear.readOnly = true;
        cancelEditBtn.classList.remove("d-none");
      });
    });

    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const reportId = e.currentTarget.dataset.id;
        if (confirm("Yakin ingin menghapus laporan ini?")) {
          await fetch(`http://127.0.0.1:8000/hapus-laporan/${reportId}`, { method: "DELETE" });
          tickerSelect.dispatchEvent(new Event("change"));
        }
      });
    });
  }

  saveReportBtn.addEventListener("click", async () => {
    const ticker = tickerSelect.value;
    if (!ticker) return alert("Pilih ticker dulu!");
    if (!inputYear.value || !inputNetIncome.value || !inputFCF.value) return alert("Lengkapi data!");

    const payload = {
      ticker: ticker,
      year: parseInt(inputYear.value),
      net_income: parseFloat(inputNetIncome.value),
      fcf: parseFloat(inputFCF.value),
    };

    const isEdit = editReportId.value !== "";
    let url = "http://127.0.0.1:8000/tambah-laporan";
    let method = "POST";

    if (isEdit) {
      url = `http://127.0.0.1:8000/edit-laporan/${editReportId.value}`;
      method = "PUT";
    }

    saveReportBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Menyimpan...';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.ok) {
        alert(data.message || "Berhasil!");
        resetForm();
        tickerSelect.dispatchEvent(new Event("change"));
      } else {
        alert(data.error || data.detail);
      }
    } catch (error) {
      alert("Koneksi gagal.");
    }
    saveReportBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Data';
  });

  cancelEditBtn.addEventListener("click", resetForm);

  function resetForm() {
    formTitle.innerText = "Tambah Laporan Baru";
    formTitle.className = "text-white mb-3";
    editReportId.value = "";
    inputYear.value = "";
    inputNetIncome.value = "";
    inputFCF.value = "";
    inputYear.readOnly = false;
    cancelEditBtn.classList.add("d-none");
  }

  // ============================================================
  // BAGIAN B: KELOLA TICKER (FITUR BARU)
  // ============================================================

  const sektorSelect = document.getElementById("sektorSelect");
  const inputTickerBaru = document.getElementById("inputTickerBaru");
  const inputNamaEmiten = document.getElementById("inputNamaEmiten");
  const inputShares = document.getElementById("inputShares");
  const inputPER = document.getElementById("inputPER");
  const inputWeightDCF = document.getElementById("inputWeightDCF");
  const inputMaxGrowth = document.getElementById("inputMaxGrowth");
  const inputManualGrowth = document.getElementById("inputManualGrowth");
  const cekSharesBtn = document.getElementById("cekSharesBtn");
  const saveTickerBtn = document.getElementById("saveTickerBtn");
  const cancelEditTickerBtn = document.getElementById("cancelEditTickerBtn");
  const tickerFormTitle = document.getElementById("tickerFormTitle");
  const editTickerCode = document.getElementById("editTickerCode");
  const tickerListBody = document.getElementById("tickerListBody");

  let sektorDefaults = {};

  // Load sektor defaults dari API
  async function loadSektorDefaults() {
    try {
      const res = await fetch("http://127.0.0.1:8000/sektor-defaults");
      sektorDefaults = await res.json();

      // Isi dropdown sektor
      if (sektorSelect) {
        sektorSelect.innerHTML = '<option value="">-- Pilih Sektor --</option>';
        Object.keys(sektorDefaults).forEach((sektor) => {
          sektorSelect.innerHTML += `<option value="${sektor}">${sektor}</option>`;
        });
      }
    } catch (e) {
      console.error("Gagal load sektor defaults:", e);
    }
  }
  loadSektorDefaults();

  // Auto-fill config saat sektor dipilih
  if (sektorSelect) {
    sektorSelect.addEventListener("change", () => {
      const sektor = sektorSelect.value;
      if (!sektor || !sektorDefaults[sektor]) return;

      const conf = sektorDefaults[sektor];
      inputPER.value = conf.per_standard;
      inputWeightDCF.value = conf.weight_dcf;
      inputMaxGrowth.value = conf.max_growth;
    });
  }

  // Auto-fetch shares dari yfinance
  if (cekSharesBtn) {
    cekSharesBtn.addEventListener("click", async () => {
      const ticker = inputTickerBaru.value.trim().toUpperCase();
      if (!ticker) return alert("Masukkan ticker dulu!");

      cekSharesBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
      cekSharesBtn.disabled = true;

      try {
        const res = await fetch(`http://127.0.0.1:8000/cek-shares/${ticker}`);
        const data = await res.json();

        if (data.shares) {
          inputShares.value = data.shares;
          showToast(`✅ Shares berhasil diambil dari yfinance: ${data.shares.toLocaleString("id-ID")}`, "success");
        } else {
          showToast("⚠️ Data shares tidak tersedia di yfinance. Silakan input manual.", "warning");
        }
      } catch (e) {
        showToast("❌ Gagal menghubungi server.", "danger");
      }

      cekSharesBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Cek';
      cekSharesBtn.disabled = false;
    });
  }

  // Load daftar ticker ke tabel
  async function loadTickerList() {
    if (!tickerListBody) return;
    tickerListBody.innerHTML = '<tr><td colspan="6"><i class="fa fa-spinner fa-spin"></i> Memuat...</td></tr>';

    try {
      const res = await fetch("http://127.0.0.1:8000/daftar-saham");
      const data = await res.json();

      if (data.length === 0) {
        tickerListBody.innerHTML = '<tr><td colspan="6" class="text-muted">Belum ada ticker.</td></tr>';
        return;
      }

      tickerListBody.innerHTML = "";
      data.forEach((s) => {
        tickerListBody.innerHTML += `
          <tr>
            <td class="fw-bold">${s.ticker}</td>
            <td>${s.nama_emiten}</td>
            <td><span class="badge bg-secondary">${s.sektor || "-"}</span></td>
            <td>${s.shares ? s.shares.toLocaleString("id-ID") : "-"}</td>
            <td>PER: ${s.per_standard ?? "-"} | DCF: ${s.weight_dcf ?? "-"} | Growth: ${s.max_growth ? (s.max_growth * 100).toFixed(1) + "%" : "-"}</td>
            <td>
              <button class="btn btn-sm btn-warning edit-ticker-btn me-1"
                data-ticker="${s.ticker}"
                data-nama="${s.nama_emiten}"
                data-sektor="${s.sektor || ""}"
                data-shares="${s.shares || ""}"
                data-per="${s.per_standard || ""}"
                data-dcf="${s.weight_dcf || ""}"
                data-maxgrowth="${s.max_growth || ""}"
                data-manualgrowth="${s.manual_growth || ""}">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn btn-sm btn-danger delete-ticker-btn" data-ticker="${s.ticker}">
                <i class="fa-solid fa-trash"></i>
              </button>
            </td>
          </tr>`;
      });

      pasangEventTombolTicker();
    } catch (e) {
      tickerListBody.innerHTML = '<tr><td colspan="6" class="text-danger">Gagal memuat data.</td></tr>';
    }
  }
  loadTickerList();

  function pasangEventTombolTicker() {
    // Tombol Edit Ticker
    document.querySelectorAll(".edit-ticker-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const t = e.currentTarget;
        tickerFormTitle.innerText = `Edit Ticker: ${t.dataset.ticker}`;
        tickerFormTitle.className = "text-warning mb-3";

        editTickerCode.value = t.dataset.ticker;
        inputTickerBaru.value = t.dataset.ticker;
        inputTickerBaru.readOnly = true;
        inputNamaEmiten.value = t.dataset.nama;
        sektorSelect.value = t.dataset.sektor;
        inputShares.value = t.dataset.shares;
        inputPER.value = t.dataset.per;
        inputWeightDCF.value = t.dataset.dcf;
        inputMaxGrowth.value = t.dataset.maxgrowth;
        inputManualGrowth.value = t.dataset.manualgrowth;

        cancelEditTickerBtn.classList.remove("d-none");

        // Scroll ke form
        document.getElementById("tickerFormCard").scrollIntoView({ behavior: "smooth" });
      });
    });

    // Tombol Delete Ticker
    document.querySelectorAll(".delete-ticker-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const ticker = e.currentTarget.dataset.ticker;
        if (confirm(`Yakin hapus ticker ${ticker} beserta SEMUA laporan keuangannya? Tindakan ini tidak bisa dibatalkan!`)) {
          try {
            const res = await fetch(`http://127.0.0.1:8000/hapus-ticker/${ticker}`, { method: "DELETE" });
            const data = await res.json();
            showToast(data.message, "success");
            loadTickerList();
            loadTickers(); // Refresh dropdown laporan juga
          } catch (e) {
            showToast("Gagal menghapus ticker.", "danger");
          }
        }
      });
    });
  }

  // Simpan Ticker (Tambah / Edit)
  if (saveTickerBtn) {
    saveTickerBtn.addEventListener("click", async () => {
      const ticker = inputTickerBaru.value.trim().toUpperCase();
      const nama = inputNamaEmiten.value.trim();
      const sektor = sektorSelect.value;
      const shares = parseFloat(inputShares.value);

      if (!ticker || !nama || !sektor || !shares) {
        return alert("Lengkapi data wajib: Ticker, Nama, Sektor, dan Shares!");
      }

      const payload = {
        ticker,
        nama_emiten: nama,
        sektor,
        shares,
        per_standard: inputPER.value ? parseFloat(inputPER.value) : null,
        weight_dcf: inputWeightDCF.value ? parseFloat(inputWeightDCF.value) : null,
        max_growth: inputMaxGrowth.value ? parseFloat(inputMaxGrowth.value) : null,
        manual_growth: inputManualGrowth.value ? parseFloat(inputManualGrowth.value) : null,
      };

      const isEdit = editTickerCode.value !== "";
      const url = isEdit ? `http://127.0.0.1:8000/edit-ticker/${editTickerCode.value}` : "http://127.0.0.1:8000/tambah-ticker";
      const method = isEdit ? "PUT" : "POST";

      saveTickerBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Menyimpan...';
      saveTickerBtn.disabled = true;

      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (res.ok) {
          showToast(data.message, "success");
          resetTickerForm();
          loadTickerList();
          loadTickers();
        } else {
          showToast(data.detail || "Gagal menyimpan.", "danger");
        }
      } catch (e) {
        showToast("Koneksi gagal.", "danger");
      }

      saveTickerBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Simpan Ticker';
      saveTickerBtn.disabled = false;
    });
  }

  if (cancelEditTickerBtn) {
    cancelEditTickerBtn.addEventListener("click", resetTickerForm);
  }

  function resetTickerForm() {
    if (tickerFormTitle) {
      tickerFormTitle.innerText = "Tambah Ticker Baru";
      tickerFormTitle.className = "text-white mb-3";
    }
    editTickerCode.value = "";
    inputTickerBaru.value = "";
    inputTickerBaru.readOnly = false;
    inputNamaEmiten.value = "";
    sektorSelect.value = "";
    inputShares.value = "";
    inputPER.value = "";
    inputWeightDCF.value = "";
    inputMaxGrowth.value = "";
    inputManualGrowth.value = "";
    if (cancelEditTickerBtn) cancelEditTickerBtn.classList.add("d-none");
  }

  // Helper: Toast Notification
  function showToast(message, type = "success") {
    const toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) {
      alert(message);
      return;
    }

    const toast = document.createElement("div");
    toast.className = `alert alert-${type} alert-dismissible fade show shadow`;
    toast.style.cssText = "min-width: 280px; animation: fadeIn 0.3s;";
    toast.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
  }
});
