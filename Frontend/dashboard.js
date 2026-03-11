document.addEventListener('DOMContentLoaded', () => {

    // Dependencies
    const db = window.DUMMY_DB;
    let favs = window.getFavorites();
    const topCode = window.getTopFavoriteCode();
    const topStock = db[topCode];

    // UI Elements for Top Chart
    const topFavLink = document.getElementById('topFavLink');
    const topFavCode = document.getElementById('topFavCode');
    const topFavName = document.getElementById('topFavName');
    const topFavPrice = document.getElementById('topFavPrice');
    const topFavBadge = document.getElementById('topFavBadge');
    const topFavIcon = document.getElementById('topFavIcon');

    // Populate Top Favorite UI
    topFavLink.href = `detail.html?code=${topCode}`;
    topFavCode.innerText = topCode;
    topFavName.innerText = topStock.name;
    topFavPrice.innerText = topStock.price;
    topFavBadge.innerText = topStock.change;
    
    topFavIcon.innerText = topCode.charAt(0);
    topFavIcon.style.backgroundColor = `${topStock.color}40`;
    topFavIcon.style.color = topStock.color;
    topFavIcon.style.borderColor = `${topStock.color}80`;

    if (topStock.isUp) {
        topFavBadge.classList.add('bg-success', 'bg-opacity-25', 'text-success');
    } else {
        topFavBadge.classList.add('bg-danger', 'bg-opacity-25', 'text-danger');
    }

    // Chart.js init for Top Favorite
    const ctx = document.getElementById('topChart').getContext('2d');
    
    const chartColor = topStock.isUp ? '#10b981' : '#ef4444';
    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, `${chartColor}40`); 
    gradient.addColorStop(1, `${chartColor}00`);

    // Dummy dynamic line data based on base price roughly
    const baseVal = parseInt(topStock.price.replace(/,/g, ''));
    const dummyData = [baseVal*0.98, baseVal*0.99, baseVal*1.02, baseVal*1.01, baseVal*0.99, baseVal];

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'],
            datasets: [{
                data: dummyData,
                borderColor: chartColor,
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 0, 
                pointHoverRadius: 5,
                fill: true,
                tension: 0.4 
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.5)' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { display: false } // Hide y-axis for clean look on dashboard
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });

    // Render List
    const stockListContainer = document.getElementById('stockListContainer');
    let stocksArray = Object.keys(db).map(key => {
        return {
            code: key,
            ...db[key],
            favState: favs[key]
        };
    });

    // Sorting: Fav#1 (2) -> Fav (1) -> Normal (0)
    stocksArray.sort((a, b) => b.favState - a.favState);

    function renderList(list) {
        stockListContainer.innerHTML = '';
        if(list.length === 0) {
            stockListContainer.innerHTML = '<p class="text-muted text-center py-4">No stocks found.</p>';
            return;
        }

        list.forEach(stock => {
            const badgeClass = stock.isUp ? 'badge-up' : 'badge-down';
            let favIconClass = 'fa-regular fa-star';
            if (stock.favState === 1) favIconClass = 'fa-solid fa-star-half-stroke';
            if (stock.favState === 2) favIconClass = 'fa-solid fa-star';

            const stockHTML = `
                <a href="detail.html?code=${stock.code}" class="stock-item">
                    <div class="d-flex align-items-center">
                        <div class="stock-icon m-0 me-3" style="background-color: ${stock.color}40; color: ${stock.color}; border: 1px solid ${stock.color}80;">
                            ${stock.code.charAt(0)}
                        </div>
                        <div class="stock-info">
                            <div class="d-flex align-items-center gap-2">
                                <h6 class="stock-code">${stock.code}</h6>
                                ${stock.favState !== 0 ? `<i class="${favIconClass} favorite-icon m-0"></i>` : ''}
                            </div>
                            <p class="stock-company">${stock.name}</p>
                        </div>
                    </div>
                    <div class="stock-price-info">
                        <div class="stock-price">${stock.price}</div>
                        <span class="stock-badge ${badgeClass}">${stock.change}</span>
                    </div>
                </a>
            `;
            stockListContainer.innerHTML += stockHTML;
        });
    }

    renderList(stocksArray);

    // Filter Logic
    const dSearch = document.getElementById('desktopSearch');
    const mSearch = document.getElementById('mobileSearch');

    function applyFilter(e) {
        const term = e.target.value.toLowerCase();
        // Sync values
        if (e.target.id === 'desktopSearch') mSearch.value = term;
        else dSearch.value = term;

        const filtered = stocksArray.filter(s => 
            s.code.toLowerCase().includes(term) || 
            s.name.toLowerCase().includes(term)
        );
        renderList(filtered);
    }

    dSearch.addEventListener('input', applyFilter);
    if(mSearch) mSearch.addEventListener('input', applyFilter);

});
