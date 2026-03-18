from fastapi import FastAPI, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import models, database, calculator
from config import SEKTORAL_SETTINGS, DEFAULT_SETTINGS
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import random

import smtplib
from email.message import EmailMessage

app = FastAPI()

# Middleware agar Frontend bisa mengakses API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Membuat tabel database otomatis saat startup
models.Base.metadata.create_all(bind=database.engine)

# Dependency untuk Database
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- SCHEMAS (Pydantic) ---

class LaporanInput(BaseModel):
    ticker: str
    year: int
    net_income: float
    fcf: float

class RegisterSchema(BaseModel):
    email: str
    password: str

class VerifyOTPSchema(BaseModel):
    email: str
    otp: str

# --- ENDPOINTS ---

@app.get("/")
def home():
    return {"message": "Server Saham-App Berjalan!"}

# --- 1. USER AUTH & OTP ---

@app.post("/register")
def register(user_data: RegisterSchema, db: Session = Depends(get_db)):
    # 1. Cek apakah email sudah ada
    user = db.query(models.User).filter(models.User.email == user_data.email).first()
    
    # 2. Logika: Jika user aktif, tolak. Jika belum aktif, izinkan kirim ulang OTP.
    if user and user.is_active:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar dan aktif.")
    
    otp = str(random.randint(100000, 999999))
    
    if not user:
        # Simpan user baru dengan status is_active=False
        user = models.User(
            email=user_data.email,
            hashed_password=user_data.password, 
            otp_code=otp,
            is_active=False
        )
        db.add(user)
    else:
        # Jika user sudah ada (tapi belum aktif), update OTP & passwordnya saja
        user.otp_code = otp
        user.hashed_password = user_data.password

    # 3. KIRIM EMAIL (Menggunakan konfigurasi EMAIL_ADDRESS & EMAIL_PASSWORD di bawah)
    if kirim_otp_email(user_data.email, otp):
        db.commit() 
        print(f"DEBUG: OTP {otp} terkirim ke {user_data.email}")
        return {"message": "OTP berhasil dikirim!"}
    else:
        db.rollback()
        # Jika SMTP gagal, kita tetap print ke terminal agar kamu bisa lanjut testing
        print(f"SMTP GAGAL. Gunakan OTP ini untuk testing: {otp}")
        raise HTTPException(status_code=500, detail="Gagal kirim email. Cek App Password atau koneksi internet.")

@app.post("/verify-otp")
def verify_otp(data: VerifyOTPSchema, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email, models.User.otp_code == data.otp).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Kode OTP salah atau email tidak ditemukan.")
    
    user.is_active = True
    user.otp_code = None # Hapus OTP setelah sukses verifikasi
    db.commit()
    
    return {"message": "Akun berhasil diaktifkan. Silakan login."}

# --- 2. DAFTAR SAHAM & ADMIN INPUT ---

@app.get("/daftar-saham")
def list_saham(db: Session = Depends(get_db)):
    return db.query(models.Saham).all()

@app.post("/tambah-laporan")
def add_report(data: LaporanInput, db: Session = Depends(get_db)):
    # 1. Cari saham berdasarkan ticker
    saham = db.query(models.Saham).filter(models.Saham.ticker == data.ticker.upper()).first()
    
    if not saham:
        raise HTTPException(status_code=404, detail="Ticker saham tidak ditemukan.")

    # 2. Cek apakah laporan tahun tersebut sudah ada agar tidak duplikat
    existing = db.query(models.FinancialReport).filter(
        models.FinancialReport.saham_id == saham.id,
        models.FinancialReport.year == data.year
    ).first()
    
    if existing:
        return {"error": f"Laporan tahun {data.year} untuk {data.ticker} sudah ada."}

    # 3. Buat objek laporan baru
    new_report = models.FinancialReport(
        saham_id=saham.id,
        year=data.year,
        net_income=data.net_income,
        fcf=data.fcf
    )
    
    db.add(new_report)
    db.commit()
    
    # Data ini akan langsung mempengaruhi fungsi hitung_growth_historis di calculator
    return {"message": f"Data {data.ticker} tahun {data.year} berhasil disimpan!"}

# --- 3. ANALISIS & REKOMENDASI ---

@app.get("/rekomendasi/{ticker}")
def get_rekomendasi(
    ticker: str, 
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
    
    # 2. LOGIKA GROWTH: Cek Manual di Config dulu baru Historis
    manual_growth = conf.get('manual_growth')
    if manual_growth is not None:
        avg_growth = manual_growth
    else:
        avg_growth = calculator.hitung_growth_historis(saham.reports, ticker)

    # 3. Hitung Valuasi dengan 2 Metode
    harga_dcf = calculator.hitung_dcf_pro(laporan_terbaru.fcf, avg_growth, horizon) / shares
    harga_per = calculator.hitung_valuasi_per(laporan_terbaru.net_income, shares, conf['per_standard'])

    # 4. Hybrid Valuation
    w_dcf = conf['weight_dcf']
    harga_wajar_final = (harga_dcf * w_dcf) + (harga_per * (1.0 - w_dcf))
    
    # 5. Market Data & Margin of Safety
    harga_pasar = calculator.ambil_harga_realtime(ticker)
    rekomendasi = "HOLD"
    mos = 0
    
    if harga_pasar:
        mos = ((harga_wajar_final - harga_pasar) / harga_wajar_final) * 100
        if mos >= 30: rekomendasi = "BUY"
        elif mos < 0: rekomendasi = "SELL"

    return {
        "ticker": ticker.upper(),
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

# --- 4. DATA IHSG ---

@app.get("/ihsg-data")
def get_ihsg():
    try:
        ihsg = yf.Ticker("^JKSE")
        hist = ihsg.history(period="1d", interval="5m")
        
        if hist.empty:
            hist = ihsg.history(period="2d", interval="15m")

        current_price = hist['Close'].iloc[-1]
        prev_close = ihsg.info.get('previousClose', current_price)
        change = current_price - prev_close
        percent_change = (change / prev_close) * 100
        
        return {
            "price": round(current_price, 2),
            "change": round(change, 2),
            "percent": round(percent_change, 2),
            "chart": hist['Close'].tolist()
        }
    except Exception as e:
        return {"error": str(e)}
    

# --- KONFIGURASI EMAIL ---
EMAIL_ADDRESS = "saham.app123@gmail.com" # sahamapp email
EMAIL_PASSWORD = "nrfebniwhcrumsle" # passkey
def kirim_otp_email(ke_email, otp):
    msg = EmailMessage()
    msg['Subject'] = 'Kode Verifikasi Saham-App'
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = ke_email
    msg.set_content(f"Halo!\n\nKode OTP Anda adalah: {otp}\n\nKode ini berlaku untuk aktivasi akun Anda. Jangan sebarkan kode ini kepada siapapun.")

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            smtp.send_message(msg)
        return True
    except Exception as e:
        print(f"Error kirim email: {e}")
        return False

# --- UPDATE DI main.py ---


# --- TAMBAHKAN ENDPOINT LOGIN YANG VALID ---
class LoginSchema(BaseModel):
    email: str
    password: str

@app.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    
    if not user or user.hashed_password != data.password:
        raise HTTPException(status_code=401, detail="Email atau password salah.")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Akun Anda belum aktif. Silakan verifikasi OTP terlebih dahulu.")
    
    return {"message": "Login berhasil", "email": user.email}