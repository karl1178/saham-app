from fastapi import FastAPI, Depends, Query
from sqlalchemy.orm import Session
import models, database, calculator
from config import SEKTORAL_SETTINGS, DEFAULT_SETTINGS
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Membuat tabel database otomatis saat startup
models.Base.metadata.create_all(bind=database.engine)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def home():
    return {"message": "Server Saham-App Berjalan!"}

@app.get("/daftar-saham")
def list_saham(db: Session = Depends(get_db)):
    return db.query(models.Saham).all()

@app.get("/rekomendasi/{ticker}")
def get_rekomendasi(
    ticker: str, 
    # Update: 'regex' diganti 'pattern' untuk mengikuti standar FastAPI terbaru
    horizon: str = Query(..., pattern="^(short|mid|long)$"), 
    shares: int = 1,
    db: Session = Depends(get_db)
):
    saham = db.query(models.Saham).filter(models.Saham.ticker == ticker.upper()).first()
    
    if not saham or not saham.reports:
        return {"error": f"Data laporan keuangan {ticker} belum ada di database."}

    # 1. Ambil Config Sektoral
    conf = SEKTORAL_SETTINGS.get(ticker.upper(), DEFAULT_SETTINGS)
    laporan_terbaru = sorted(saham.reports, key=lambda x: x.year)[-1]
    
    # 2. Hitung Growth Historis
    avg_growth = calculator.hitung_growth_historis(saham.reports, ticker)

    # 3. Hitung Valuasi dengan 2 Metode
    harga_dcf = calculator.hitung_dcf_pro(laporan_terbaru.fcf, avg_growth, horizon) / shares
    harga_per = calculator.hitung_valuasi_per(laporan_terbaru.net_income, shares, conf['per_standard'])

    # 4. Gabungkan (Hybrid Valuation)
    w_dcf = conf['weight_dcf']
    harga_wajar_final = (harga_dcf * w_dcf) + (harga_per * (1.0 - w_dcf))
    
    # 5. Ambil harga pasar & Hitung MoS
    harga_pasar = calculator.ambil_harga_realtime(ticker)
    rekomendasi = "HOLD"
    mos = 0
    
    if harga_pasar:
        mos = ((harga_wajar_final - harga_pasar) / harga_wajar_final) * 100
        
        if mos >= 30: 
            rekomendasi = "BUY"
        elif mos >= 0 and mos < 30: 
            rekomendasi = "HOLD"
        elif mos < 0: 
            rekomendasi = "SELL"

    return {
        "ticker": ticker.upper(),
        # PERBAIKAN: Menggunakan 'nama_emiten' sesuai dengan models.py
        "name": saham.nama_emiten, 
        "fundamental_raw": {
            "net_income": laporan_terbaru.net_income,
            "fcf": laporan_terbaru.fcf,
            "year": laporan_terbaru.year
        },
        "analisis": {
            "growth_digunakan": f"{round(avg_growth * 100, 2)}%",
            "harga_wajar_hybrid": round(harga_wajar_final, 2),
            "harga_pasar_saat_ini": harga_pasar,
            "margin_of_safety": f"{round(mos, 2)}%",
            "rekomendasi_akhir": rekomendasi
        }
    }