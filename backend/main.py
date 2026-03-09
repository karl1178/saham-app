from fastapi import FastAPI
import calculator  # Pastikan file calculator.py ada di folder yang sama

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Server Berjalan!"}

# Pastikan path ini SAMA PERSIS dengan yang diketik di browser
@app.get("/analisis/{ticker}")
def analisis_saham(ticker: str, fcf: float, growth: float, shares: int):
    # 1. Hitung Harga Wajar dari file calculator.py
    harga_wajar = calculator.hitung_dcf(fcf, growth, 0.10, 0.03, shares)
    
    # 2. Ambil Harga Pasar (Pastikan internet aktif untuk yfinance)
    harga_pasar = calculator.ambil_harga_realtime(ticker)
    
    # 3. Logika Rekomendasi
    rekomendasi = "N/A"
    mos = 0
    if harga_pasar:
        mos = ((harga_wajar - harga_pasar) / harga_wajar) * 100
        if mos > 10: rekomendasi = "BUY"
        elif mos < -5: rekomendasi = "SELL"
        else: rekomendasi = "HOLD"

    return {
        "ticker": ticker.upper(),
        "hasil_analisis": {
            "harga_wajar": harga_wajar,
            "harga_pasar": harga_pasar,
            "margin_of_safety": f"{round(mos, 2)}%",
            "rekomendasi": rekomendasi
        }
    }