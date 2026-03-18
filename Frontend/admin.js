document.getElementById("adminForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const ticker = document.getElementById("ticker").value;
  const year = parseInt(document.getElementById("year").value);
  const net_income = parseFloat(document.getElementById("net_income").value);
  const fcf = parseFloat(document.getElementById("fcf").value);

  const statusDiv = document.getElementById("statusMessage");
  statusDiv.classList.remove("d-none", "text-success", "text-danger");
  statusDiv.innerText = "Sedang mengirim data...";

  try {
    // Panggil endpoint FastAPI (Pastikan URL & Method sesuai)
    const response = await fetch(`http://127.0.0.1:8000/tambah-laporan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, year, net_income, fcf }),
    });

    const result = await response.json();

    if (response.ok) {
      statusDiv.innerText = "✅ Sukses! Data berhasil masuk ke SQL.";
      statusDiv.classList.add("text-success");
      document.getElementById("adminForm").reset();
    } else {
      statusDiv.innerText = "❌ Gagal: " + result.error;
      statusDiv.classList.add("text-danger");
    }
  } catch (err) {
    statusDiv.innerText = "❌ Error: Tidak bisa terhubung ke server.";
    statusDiv.classList.add("text-danger");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // 1. Ambil data user dari localStorage (asumsi data login disimpan di sini)
  const loggedInUser = JSON.parse(localStorage.getItem("user"));

  // 2. Cek apakah user sudah login dan apakah emailnya admin@gmail.com
  if (!loggedInUser || loggedInUser.email !== "admin@gmail.com") {
    alert("Akses Terlarang! Hanya Admin yang dapat mengakses halaman ini.");
    window.location.href = "dashboard.html"; // Lempar balik ke dashboard
  }
});

// Di admin.js
async function loadTickers() {
  const response = await fetch("http://127.0.0.1:8000/daftar-saham");
  const stocks = await response.json();
  const select = document.getElementById("ticker");

  stocks.forEach((s) => {
    let opt = document.createElement("option");
    opt.value = s.ticker;
    opt.innerHTML = `${s.ticker} - ${s.nama_emiten}`;
    select.appendChild(opt);
  });
}
loadTickers();
