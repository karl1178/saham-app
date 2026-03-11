document.addEventListener('DOMContentLoaded', () => {
    
    // Dependencies from storage.js
    const db = window.DUMMY_DB;
    
    const favStar = document.getElementById('favStar');
    const stockCodeEl = document.getElementById('stockCode');
    const stockNameEl = document.getElementById('stockName');
    const stockNameMobileEl = document.getElementById('stockNameMobile');
    const stockPriceEl = document.getElementById('stockPrice');
    const stockChangeBadge = document.getElementById('stockChangeBadge');
    const netIncomeEl = document.getElementById('netIncome');
    const marketCapEl = document.getElementById('marketCap');

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code') || 'BBCA'; 
    const stock = db[code] || db['BBCA'];

    // Populate Data
    stockCodeEl.innerText = code;
    stockNameEl.innerText = stock.name;
    stockNameMobileEl.innerText = stock.name;
    stockPriceEl.innerText = stock.price;
    stockChangeBadge.innerText = stock.change;

    if (stock.isUp) {
        stockChangeBadge.classList.add('bg-success', 'bg-opacity-25', 'text-success');
    } else {
        stockChangeBadge.classList.add('bg-danger', 'bg-opacity-25', 'text-danger');
    }

    netIncomeEl.innerText = `${stock.netIncome} Triliun`;
    marketCapEl.innerText = `${stock.mcap} Triliun`;

    // Chart logic
    const ctx = document.getElementById('detailChart').getContext('2d');
    const chartColor = stock.isUp ? '#10b981' : '#ef4444';
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, `${chartColor}40`); 
    gradient.addColorStop(1, `${chartColor}00`);

    const baseVal = parseInt(stock.price.replace(/,/g, ''));
    // Generate some random looking data for detail
    const dummyData = [
        baseVal*0.97, baseVal*0.99, baseVal*0.98, baseVal*1.01, 
        baseVal*1.03, baseVal*1.02, baseVal*0.99, baseVal*1.02, 
        baseVal*1.04, baseVal*1.01, baseVal*0.99, baseVal
    ];
    
    const labels = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '16:00'];

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: code,
                data: dummyData,
                borderColor: chartColor,
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 2, 
                pointHoverRadius: 6,
                fill: true,
                tension: 0.3 
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
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderWidth: 1,
                    padding: 10
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.6)', maxTicksLimit: 8 }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.6)' }
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });


    // Favorite Logic 
    const favs = window.getFavorites();
    let favState = favs[code] || 0; 
    
    const updateFavIcon = () => {
        favStar.classList.remove('fa-regular', 'fa-solid', 'fa-star', 'fa-star-half-stroke');
        if (favState === 0) {
            favStar.classList.add('fa-regular', 'fa-star'); // Normal
        } else if (favState === 1) {
            favStar.classList.add('fa-solid', 'fa-star-half-stroke'); // Favorite
        } else if (favState === 2) {
            favStar.classList.add('fa-solid', 'fa-star'); // Favorite #1
        }
    };

    updateFavIcon(); // Init

    favStar.addEventListener('click', () => {
        // Cycle states: 0 -> 1 -> 2 -> 0
        favState = (favState + 1) % 3;
        updateFavIcon();
        
        // Save to LocalStorage using global function
        window.setFavorite(code, favState);
    });

});
