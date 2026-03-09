import yfinance as yf

def ambil_harga_realtime(ticker):
    # Tambahkan .JK untuk saham Indonesia (misal: BBCA.JK)
    if not ticker.endswith(".JK"):
        ticker_id = f"{ticker}.JK"
    else:
        ticker_id = ticker
        
    stock = yf.Ticker(ticker_id)
    # Ambil harga penutupan terakhir
    data = stock.history(period="1d")
    if not data.empty:
        return round(data['Close'].iloc[-1], 2)
    return None

def hitung_dcf(fcf_terakhir, growth_rate, discount_rate, terminal_growth, jumlah_saham):
    """
    Rumus DCF Sederhana Proyeksi 5 Tahun
    """
    proyeksi_fcf = []
    present_value_fcf = []
    
    # 1. Hitung proyeksi FCF 5 tahun ke depan dan tarik ke nilai sekarang (PV)
    current_fcf = fcf_terakhir
    for thn in range(1, 6):
        current_fcf *= (1 + growth_rate)
        proyeksi_fcf.append(current_fcf)
        
        pv = current_fcf / ((1 + discount_rate) ** thn)
        present_value_fcf.append(pv)
    
    # 2. Hitung Terminal Value (Nilai sisa setelah tahun ke-5)
    terminal_value = (proyeksi_fcf[-1] * (1 + terminal_growth)) / (discount_rate - terminal_growth)
    pv_terminal_value = terminal_value / ((1 + discount_rate) ** 5)
    
    # 3. Total Nilai Perusahaan (Enterprise Value)
    total_ev = sum(present_value_fcf) + pv_terminal_value
    
    # 4. Harga Wajar per Lembar Saham
    harga_wajar = total_ev / jumlah_saham
    return round(harga_wajar, 2)