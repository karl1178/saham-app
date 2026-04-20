import yfinance as yf
from config import SEKTORAL_SETTINGS, DEFAULT_SETTINGS


def get_saham_config(saham):
    """
    Ambil config valuasi untuk saham.
    Prioritas:
    1. Kolom langsung di DB (per_standard, weight_dcf, max_growth) — jika sudah diisi admin
    2. SEKTORAL_SETTINGS (legacy hardcode) — fallback untuk ticker lama
    3. DEFAULT_SETTINGS — fallback terakhir
    """
    # Cek apakah saham sudah punya config di DB
    if saham.per_standard is not None and saham.weight_dcf is not None and saham.max_growth is not None:
        return {
            "per_standard": saham.per_standard,
            "weight_dcf": saham.weight_dcf,
            "max_growth": saham.max_growth,
            "manual_growth": saham.manual_growth,
        }

    # Fallback ke SEKTORAL_SETTINGS (ticker lama)
    legacy = SEKTORAL_SETTINGS.get(saham.ticker.upper())
    if legacy:
        return legacy

    # Fallback terakhir
    return DEFAULT_SETTINGS


def hitung_growth_historis(reports, saham):
    """
    Hitung rata-rata pertumbuhan FCF historis.
    Menerima object saham (bukan ticker string) agar bisa baca config dari DB.
    """
    sorted_reports = sorted(reports, key=lambda x: x.year)
    if len(sorted_reports) < 2:
        return 0.05

    growths = []
    for i in range(1, len(sorted_reports)):
        prev_fcf = sorted_reports[i - 1].fcf
        curr_fcf = sorted_reports[i].fcf
        if prev_fcf and prev_fcf > 0:
            growths.append((curr_fcf - prev_fcf) / prev_fcf)

    if not growths:
        return 0.05

    avg_growth = sum(growths) / len(growths)

    conf = get_saham_config(saham)

    # Safety margin: gunakan 70% dari growth asli, cap oleh max_growth
    conservative_growth = avg_growth * 0.7
    return min(conservative_growth, conf["max_growth"])


def hitung_dcf_pro(fcf_terakhir, growth_rate, horizon):
    discount_map = {"short": 0.15, "mid": 0.12, "long": 0.10}
    dr = discount_map.get(horizon, 0.12)

    terminal_growth = 0.02
    proyeksi_fcf = []
    curr = fcf_terakhir

    for t in range(1, 6):
        curr *= 1 + growth_rate
        proyeksi_fcf.append(curr / ((1 + dr) ** t))

    tv = (curr * (1 + terminal_growth)) / (dr - terminal_growth)
    return sum(proyeksi_fcf) + (tv / ((1 + dr) ** 5))


def hitung_valuasi_per(net_income_terakhir, shares, avg_per):
    return (net_income_terakhir / shares) * avg_per


def ambil_harga_realtime(ticker):
    try:
        stock = yf.Ticker(f"{ticker}.JK")
        data = stock.history(period="1d")
        return round(data["Close"].iloc[-1], 2) if not data.empty else None
    except:
        return None


def ambil_shares_dari_yfinance(ticker):
    """
    Coba ambil jumlah saham beredar dari yfinance.
    Return None jika tidak tersedia (admin harus input manual).
    """
    try:
        stock = yf.Ticker(f"{ticker}.JK")
        info = stock.info
        shares = info.get("sharesOutstanding") or info.get("impliedSharesOutstanding")
        if shares and shares > 0:
            return int(shares)
        return None
    except:
        return None