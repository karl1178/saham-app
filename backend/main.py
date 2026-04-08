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

import bcrypt

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

# --- KONFIGURASI HASHING PASSWORD  ---
def get_password_hash(password: str):
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_bytes.decode('utf-8') 

def verify_password(plain_password: str, hashed_password: str):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


# --- KONFIGURASI EMAIL ---
EMAIL_ADDRESS = "saham.app123@gmail.com" 
EMAIL_PASSWORD = "nrfebniwhcrumsle" 

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


# --- SCHEMAS (Pydantic) ---

class VerifyResetOTPSchema(BaseModel):
    email: str
    otp: str

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

class LoginSchema(BaseModel):
    email: str
    password: str

class ForgotPasswordSchema(BaseModel):
    email: str

class ResetPasswordSchema(BaseModel):
    email: str
    otp: str
    new_password: str

# --- ENDPOINTS ---

@app.get("/")
def home():
    return {"message": "Server Saham-App Berjalan!"}

# --- ENDPOINT DETEKTIF (Untuk Cek Database) ---
@app.get("/cek-user")
def cek_user(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    if not users:
        return {"message": "Database kosong! Tidak ada user yang tersimpan."}
    
    return [
        {
            "email": u.email, 
            "password": u.hashed_password, 
            "is_active": u.is_active,
            "otp_code": u.otp_code
        } 
        for u in users
    ]


# --- 1. USER AUTH & OTP ---

@app.post("/register")
def register(user_data: RegisterSchema, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_data.email.lower()).first()
    
    if user and user.is_active:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar dan aktif.")
    
    otp = str(random.randint(100000, 999999))
    
    if not user:
        user = models.User(
            email=user_data.email,
            # UBAH DI SINI: Menyimpan password dalam bentuk HASH
            hashed_password=get_password_hash(user_data.password), 
            otp_code=otp,
            is_active=False
        )
        db.add(user)
    else:
        user.otp_code = otp
        # UBAH DI SINI: Menyimpan password dalam bentuk HASH
        user.hashed_password = get_password_hash(user_data.password)

    if kirim_otp_email(user_data.email, otp):
        db.commit() 
        print(f"DEBUG: OTP {otp} terkirim ke {user_data.email}")
        return {"message": "OTP berhasil dikirim!"}
    else:
        db.rollback()
        print(f"SMTP GAGAL. Gunakan OTP ini untuk testing: {otp}")
        raise HTTPException(status_code=500, detail="Gagal kirim email. Cek App Password atau koneksi internet.")

@app.post("/verify-otp")
def verify_otp(data: VerifyOTPSchema, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email, models.User.otp_code == data.otp).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Kode OTP salah atau email tidak ditemukan.")
    
    user.is_active = True
    user.otp_code = None 
    db.commit()
    return {"message": "Akun berhasil diaktifkan. Silakan login."}

@app.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    
    # UBAH DI SINI: Membandingkan ketikan password dengan HASH di database
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email atau password salah.")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Akun Anda belum aktif. Silakan verifikasi OTP terlebih dahulu.")
    
    return {"message": "Login berhasil", "email": user.email}

@app.post("/forgot-password")
def forgot_password(data: ForgotPasswordSchema, db: Session = Depends(get_db)):
    # Menggunakan .lower() agar tidak sensitif huruf besar/kecil
    user = db.query(models.User).filter(models.User.email == data.email.lower()).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Email tidak terdaftar.")
    
    # Buat OTP 6 digit baru
    otp = str(random.randint(100000, 999999))
    user.otp_code = otp
    
    if kirim_otp_email(user.email, otp):
        db.commit()
        return {"message": "OTP untuk reset password telah dikirim ke email."}
    else:
        db.rollback()
        raise HTTPException(status_code=500, detail="Gagal mengirim email OTP.")

@app.post("/verify-reset-otp")
def verify_reset_otp(data: VerifyResetOTPSchema, db: Session = Depends(get_db)):
    # Cek apakah kombinasi Email dan OTP ini benar
    user = db.query(models.User).filter(
        models.User.email == data.email.lower(),
        models.User.otp_code == data.otp
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Kode OTP salah atau kadaluarsa.")
    
    return {"message": "OTP Valid! Silakan masukkan password baru."}

@app.post("/reset-password")
def reset_password(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    # Cocokkan email dan OTP
    user = db.query(models.User).filter(
        models.User.email == data.email.lower(), 
        models.User.otp_code == data.otp
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Kode OTP salah atau tidak valid.")
    
    # Hash password baru dan simpan
    user.hashed_password = get_password_hash(data.new_password)
    user.otp_code = None # Hapus OTP agar tidak bisa dipakai 2x
    db.commit()
    
    return {"message": "Password berhasil diubah! Silakan login."}

# --- 2. DAFTAR SAHAM & ADMIN INPUT ---
@app.get("/daftar-saham")
def list_saham(db: Session = Depends(get_db)):
    return db.query(models.Saham).all()

@app.post("/tambah-laporan")
def add_report(data: LaporanInput, db: Session = Depends(get_db)):
    saham = db.query(models.Saham).filter(models.Saham.ticker == data.ticker.upper()).first()
    if not saham:
        raise HTTPException(status_code=404, detail="Ticker saham tidak ditemukan.")

    existing = db.query(models.FinancialReport).filter(
        models.FinancialReport.saham_id == saham.id,
        models.FinancialReport.year == data.year
    ).first()
    
    if existing:
        return {"error": f"Laporan tahun {data.year} untuk {data.ticker} sudah ada."}

    new_report = models.FinancialReport(
        saham_id=saham.id,
        year=data.year,
        net_income=data.net_income,
        fcf=data.fcf
    )
    db.add(new_report)
    db.commit()
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

    conf = SEKTORAL_SETTINGS.get(ticker.upper(), DEFAULT_SETTINGS)
    laporan_terbaru = sorted(saham.reports, key=lambda x: x.year)[-1]
    
    manual_growth = conf.get('manual_growth')
    if manual_growth is not None:
        avg_growth = manual_growth
    else:
        avg_growth = calculator.hitung_growth_historis(saham.reports, ticker)

    harga_dcf = calculator.hitung_dcf_pro(laporan_terbaru.fcf, avg_growth, horizon) / shares
    harga_per = calculator.hitung_valuasi_per(laporan_terbaru.net_income, shares, conf['per_standard'])

    w_dcf = conf['weight_dcf']
    harga_wajar_final = (harga_dcf * w_dcf) + (harga_per * (1.0 - w_dcf))
    
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
    

# --- TAMBAHAN UNTUK FITUR ADMIN (EDIT, DELETE, GET REPORT) ---

class LaporanUpdate(BaseModel):
    year: int
    net_income: float
    fcf: float

@app.get("/laporan/{ticker}")
def get_laporan_ticker(ticker: str, db: Session = Depends(get_db)):
    saham = db.query(models.Saham).filter(models.Saham.ticker == ticker.upper()).first()
    if not saham:
        raise HTTPException(status_code=404, detail="Ticker tidak ditemukan")
    
    # Urutkan berdasarkan tahun
    reports = sorted(saham.reports, key=lambda x: x.year)
    return reports

@app.put("/edit-laporan/{report_id}")
def edit_laporan(report_id: int, data: LaporanUpdate, db: Session = Depends(get_db)):
    report = db.query(models.FinancialReport).filter(models.FinancialReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
    
    report.year = data.year
    report.net_income = data.net_income
    report.fcf = data.fcf
    db.commit()
    return {"message": "Data berhasil diperbarui!"}

@app.delete("/hapus-laporan/{report_id}")
def hapus_laporan(report_id: int, db: Session = Depends(get_db)):
    report = db.query(models.FinancialReport).filter(models.FinancialReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
    
    db.delete(report)
    db.commit()
    return {"message": "Data berhasil dihapus!"}

# @app.delete("/reset-semua-user") #ini utk debug hapus all user, utk save pass mrk dalam hash
# def reset_semua_user(db: Session = Depends(get_db)):
#     # Perintah ini HANYA menghapus data di tabel User
#     db.query(models.User).delete()
#     db.commit()
#     return {"message": "Seluruh data User berhasil dikosongkan. Data Saham dan FCF kamu tetap AMAN!"}