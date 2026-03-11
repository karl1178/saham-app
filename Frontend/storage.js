// LocalStorage Integration Logic
const DUMMY_DB = {
    'BBCA': { name: 'Bank Central Asia Tbk.', price: '9,875', change: '-125 (-1.79%)', isUp: false, color: '#0ea5e9', netIncome: 'Rp 48.6', mcap: 'Rp 1,215' },
    'BBRI': { name: 'Bank Rakyat Indonesia Tbk.', price: '5,570', change: '-100 (-1.72%)', isUp: false, color: '#3b82f6', netIncome: 'Rp 60.4', mcap: 'Rp 844' },
    'BUMI': { name: 'Bumi Resources Tbk.', price: '220', change: '-10 (-4.35%)', isUp: false, color: '#eab308', netIncome: 'Rp 2.1', mcap: 'Rp 31.4' },
    'PTRO': { name: 'Petrosea Tbk.', price: '4,990', change: '+30 (+0.60%)', isUp: true, color: '#10b981', netIncome: 'Rp 0.8', mcap: 'Rp 5.0' },
    'RAJA': { name: 'Rukun Raharja Tbk.', price: '1,350', change: '+15 (+1.10%)', isUp: true, color: '#f59e0b', netIncome: 'Rp 0.4', mcap: 'Rp 5.7' },
    'RATU': { name: 'Ratu Prabu Energi Tbk.', price: '143', change: '-10 (-1.74%)', isUp: false, color: '#8b5cf6', netIncome: 'Rp -0.1', mcap: 'Rp 1.1' }
};

// Initialize favorites in localStorage if not exists
if (!localStorage.getItem('saham_favorites')) {
    // Default: BBCA is fav #1 (2), BBRI & RATU are fav (1), rest are normal (0)
   const initialFavs = {
       'BBCA': 2,
       'BBRI': 1,
       'RATU': 1,
       'BUMI': 0,
       'PTRO': 0,
       'RAJA': 0
   };
   localStorage.setItem('saham_favorites', JSON.stringify(initialFavs));
}

function getFavorites() {
    return JSON.parse(localStorage.getItem('saham_favorites'));
}

function setFavorite(code, state) {
    const favs = getFavorites();
    // If setting to Fav #1 (state 2), downgrade others that are state 2 to state 1
    if (state === 2) {
        for (let key in favs) {
            if (favs[key] === 2) favs[key] = 1;
        }
    }
    favs[code] = state;
    localStorage.setItem('saham_favorites', JSON.stringify(favs));
}

function getTopFavoriteCode() {
    const favs = getFavorites();
    // Find item with state 2
    let topCode = Object.keys(favs).find(k => favs[k] === 2);
    // Fallback: finding first one with state 1, or just grabbing the first key
    if (!topCode) topCode = Object.keys(favs).find(k => favs[k] === 1) || Object.keys(favs)[0];
    return topCode;
}

// Ensure the functions are globally available
window.getFavorites = getFavorites;
window.setFavorite = setFavorite;
window.getTopFavoriteCode = getTopFavoriteCode;
window.DUMMY_DB = DUMMY_DB;
