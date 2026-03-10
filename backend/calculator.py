import yfinance as yf
from config import SEKTORAL_SETTINGS, DEFAULT_SETTINGS

def hitung_growth_historis(reports, ticker):
    sorted_reports = sorted(reports, key=lambda x: x.year)
    if len(sorted_reports) < 2:
        return 0.05
    
    growths = []
    for i in range(1, len(sorted_reports)):
        prev_fcf = sorted_reports[i-1].fcf
        curr_fcf = sorted_reports[i].fcf
        if prev_fcf and prev_fcf > 0:
            growths.append((curr_fcf - prev_fcf) / prev_fcf)
            
    if not growths:
        return 0.05
        
    avg_growth = sum(growths) / len(growths)
    
    # Ambil batas dari config.py
    conf = SEKTORAL_SETTINGS.get(ticker.upper(), DEFAULT_SETTINGS)
    
    # Safety Margin: Gunakan 70% dari growth asli, dan jangan lewati max_growth
    conservative_growth = avg_growth * 0.7
    return min(conservative_growth, conf['max_growth'])

def hitung_dcf_pro(fcf_terakhir, growth_rate, horizon):
    discount_map = {"short": 0.15, "mid": 0.12, "long": 0.10}
    dr = discount_map.get(horizon, 0.12)
    
    terminal_growth = 0.02
    proyeksi_fcf = []
    curr = fcf_terakhir
    
    for t in range(1, 6):
        curr *= (1 + growth_rate)
        proyeksi_fcf.append(curr / ((1 + dr) ** t))
        
    tv = (curr * (1 + terminal_growth)) / (dr - terminal_growth)
    return sum(proyeksi_fcf) + (tv / ((1 + dr) ** 5))

def hitung_valuasi_per(net_income_terakhir, shares, avg_per):
    # EPS (Earning Per Share) dikali dengan PER standar sektor
    return (net_income_terakhir / shares) * avg_per

def ambil_harga_realtime(ticker):
    try:
        stock = yf.Ticker(f"{ticker}.JK")
        data = stock.history(period="1d")
        return round(data['Close'].iloc[-1], 2) if not data.empty else None
    except:
        return None