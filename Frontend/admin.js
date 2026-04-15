document.addEventListener("DOMContentLoaded", async () => {
  // --- 1. PENJAGA PINTU VIP (Hanya Admin yang boleh masuk) ---
  const userEmail = localStorage.getItem("user_email");
  if (userEmail !== "karlferdinan1@gmail.com") {
    alert("Akses Ilegal! Anda bukan Admin.");
    window.location.href = "dashboard.html"; // Tendang keluar
    return;
  }

  const tickerSelect = document.getElementById("tickerSelect");
  const reportTableBody = document.getElementById("reportTableBody");
  const saveReportBtn = document.getElementById("saveReportBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const formTitle = document.getElementById("formTitle");

  const inputYear = document.getElementById("inputYear");
  const inputNetIncome = document.getElementById("inputNetIncome");
  const inputFCF = document.getElementById("inputFCF");
  const editReportId = document.getElementById("editReportId");

  // --- 2. LOAD DAFTAR TICKER ---
  async function loadTickers() {
    try {
      const response = await fetch("http://127.0.0.1:8000/daftar-saham");
      const data = await response.json();

      // Setel warna dropdown utama ke putih agar kontras dengan background gelap
      tickerSelect.style.color = "white";
      tickerSelect.style.backgroundColor = "#212529"; // Warna gelap khas Bootstrap dark

      // Placeholder "-- Pilih Ticker Saham --" tetap putih
      tickerSelect.innerHTML = '<option value="" style="color: white; background-color: #212529;">-- Pilih Ticker Saham --</option>';

      data.forEach((saham) => {
        // Daftar saham: Background gelap, teks putih
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

  // --- 3. LOAD LAPORAN SAAT TICKER DIPILIH ---
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

      // Render Tabel
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
                    </tr>
                `;
      });

      pasangEventTombol(); // Pasang event click untuk tombol edit & delete
    } catch (error) {
      reportTableBody.innerHTML = '<tr><td colspan="4" class="text-danger">Terjadi kesalahan koneksi.</td></tr>';
    }
  });

  // --- 4. EVENT TOMBOL EDIT & DELETE ---
  function pasangEventTombol() {
    // Tombol Edit
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget;
        formTitle.innerText = "Edit Laporan (ID: " + target.dataset.id + ")";
        formTitle.className = "text-warning mb-3";

        editReportId.value = target.dataset.id;
        inputYear.value = target.dataset.year;
        inputNetIncome.value = target.dataset.ni;
        inputFCF.value = target.dataset.fcf;

        inputYear.readOnly = true; // Tahun biasanya tidak diubah
        cancelEditBtn.classList.remove("d-none");
      });
    });

    // Tombol Delete
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const reportId = e.currentTarget.dataset.id;
        if (confirm("Yakin ingin menghapus laporan ini?")) {
          await fetch(`http://127.0.0.1:8000/hapus-laporan/${reportId}`, { method: "DELETE" });
          tickerSelect.dispatchEvent(new Event("change")); // Refresh tabel
        }
      });
    });
  }

  // --- 5. SIMPAN (TAMBAH / EDIT) ---
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
        tickerSelect.dispatchEvent(new Event("change")); // Refresh tabel
      } else {
        alert(data.error || data.detail);
      }
    } catch (error) {
      alert("Koneksi gagal.");
    }
    saveReportBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Data';
  });

  // --- 6. BATAL EDIT ---
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
});
