from fastapi import FastAPI, Depends, Query
from sqlalchemy.orm import Session
import models, database, calculator

app = FastAPI()

# Membuat tabel database otomatis saat startup
models.Base.metadata.create_all(bind=database.engine)

# Dependency untuk mendapatkan session database
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def home():
    return {"message": "Server Saham-App Berjalan!"}

@app.get("/rekomendasi/{ticker}")
def get_rekomendasi(
    ticker: str, 
    horizon: str = Query(..., regex="^(short|mid|long)$"), 
    shares: int = 1,
    db: Session = Depends(get_db)
):
    # 1. Ambil data saham & laporan historis dari database SQL
    saham = db.query(models.Saham).filter(models.Saham.ticker == ticker.upper()).first()
    
    if not saham or not saham.reports:
        return {"error": f"Data laporan keuangan {ticker} belum ada di database. Silakan jalankan seed_data.py dulu."}

    # 2. Hitung Growth Rate otomatis dari data historis di SQL
    avg_growth = calculator.hitung_growth_historis(saham.reports)
    fcf_terakhir = sorted(saham.reports, key=lambda x: x.year)[-1].fcf

    # 3. Hitung Harga Wajar berdasarkan Horizon
    # Short = diskon tinggi, Mid = menengah, Long = standar
    horizon_map = {"short": 0.15, "mid": 0.12, "long": 0.10} # Discount Rate berbeda
    
    enterprise_value = calculator.hitung_dcf_pro(fcf_terakhir, avg_growth, horizon)
    harga_wajar = enterprise_value / shares
    
    # 4. Ambil harga pasar real-time
    harga_pasar = calculator.ambil_harga_realtime(ticker)
    
    # 5. Logika Rekomendasi
    rekomendasi = "HOLD"
    mos = 0
    if harga_pasar:
        mos = ((harga_wajar - harga_pasar) / harga_wajar) * 100
        if mos > 15: rekomendasi = "BUY"
        elif mos < 0: rekomendasi = "SELL"

    return {
        "ticker": ticker.upper(),
        "horizon_pilihan": horizon,
        "detail_analisis": {
            "rata_rata_growth_historis": f"{round(avg_growth * 100, 2)}%",
            "harga_wajar_dcf": round(harga_wajar, 2),
            "harga_pasar_saat_ini": harga_pasar,
            "margin_of_safety": f"{round(mos, 2)}%",
            "rekomendasi_akhir": rekomendasi
        }
    }

@app.get("/daftar-saham")
def list_saham(db: Session = Depends(get_db)):
    return db.query(models.Saham).all()