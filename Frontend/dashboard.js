document.addEventListener("DOMContentLoaded", async () => {
  // Dependencies untuk favorite
  let favs = window.getFavorites ? window.getFavorites() : {};
  const stockListContainer = document.getElementById("stockListContainer");

  try {
    // --- 1. FETCH DAFTAR SAHAM DARI BACKEND ---
    stockListContainer.innerHTML = '<p class="text-center py-4">Memuat data dari server...</p>';

    const response = await fetch("http://127.0.0.1:8000/daftar-saham");
    const dbSaham = await response.json(); // Array dari SQL Database kita

    // 2. Petakan data SQL ke format array yang dibaca oleh UI kita
    let stocksArray = dbSaham.map((saham) => {
      return {
        code: saham.ticker,
        name: saham.name || "Perusahaan Terbuka",
        color: "#10b981", // Default warna
        price: "Cek Detail", // Harga real-time ditarik di halaman detail
        change: "Analisis",
        isUp: true,
        favState: favs[saham.ticker] || 0,
      };
    });

    // Sorting Favorite
    stocksArray.sort((a, b) => b.favState - a.favState);

    // 3. Fungsi Render List
    function renderList(list) {
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

    // 4. Filter Logic (Search)
    const dSearch = document.getElementById("desktopSearch");
    const mSearch = document.getElementById("mobileSearch");

    function applyFilter(e) {
      const term = e.target.value.toLowerCase();
      if (e.target.id === "desktopSearch" && mSearch) mSearch.value = term;
      else if (dSearch) dSearch.value = term;

      const filtered = stocksArray.filter((s) => s.code.toLowerCase().includes(term) || s.name.toLowerCase().includes(term));
      renderList(filtered);
    }

    if (dSearch) dSearch.addEventListener("input", applyFilter);
    if (mSearch) mSearch.addEventListener("input", applyFilter);
  } catch (error) {
    console.error("Gagal load data list saham:", error);
    stockListContainer.innerHTML = '<p class="text-danger text-center py-4">Gagal terhubung ke Database Backend.</p>';
  }
});
