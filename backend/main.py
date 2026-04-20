from fastapi import FastAPI, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import models, database, calculator
from config import SEKTORAL_SETTINGS, DEFAULT_SETTINGS, SEKTOR_DEFAULTS
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import random

import smtplib
from email.message import EmailMessage

import bcrypt

import os
from dotenv import load_dotenv

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


# --- KONFIGURASI HASHING PASSWORD ---
def get_password_hash(password: str):
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed_bytes.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str):
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


# Load file .env
load_dotenv()

EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")


def kirim_otp_email(ke_email, otp):
    msg = EmailMessage()
    msg["Subject"] = "Kode Verifikasi Saham-App"
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = ke_email
    msg.set_content(
        f"Halo!\n\nKode OTP Anda adalah: {otp}\n\nKode ini berlaku untuk aktivasi akun Anda. Jangan sebarkan kode ini kepada siapapun."
    )
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
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


# === SCHEMA BARU: Tambah Ticker ===
class TambahTickerSchema(BaseModel):
    ticker: str
    nama_emiten: str
    sektor: str
    shares: float
    per_standard: Optional[float] = None   # Jika None, pakai default sektor
    weight_dcf: Optional[float] = None
    max_growth: Optional[float] = None
    manual_growth: Optional[float] = None  # Opsional


class EditTickerSchema(BaseModel):
    nama_emiten: str
    sektor: str
    shares: float
    per_standard: float
    weight_dcf: float
    max_growth: float
    manual_growth: Optional[float] = None


# --- ENDPOINTS ---

@app.get("/")
def home():
    return {"message": "Server Saham-App Berjalan!"}


# --- ENDPOINT DETEKTIF ---
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
            "otp_code": u.otp_code,
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
            hashed_password=get_password_hash(user_data.password),
            otp_code=otp,
            is_active=False,
        )
        db.add(user)
    else:
        user.otp_code = otp
        user.hashed_password = get_password_hash(user_data.password)

    if kirim_otp_email(user_data.email, otp):
        db.commit()
        return {"message": "OTP berhasil dikirim!"}
    else:
        db.rollback()
        raise HTTPException(status_code=500, detail="Gagal kirim email. Cek App Password atau koneksi internet.")


@app.post("/verify-otp")
def verify_otp(data: VerifyOTPSchema, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.email == data.email, models.User.otp_code == data.otp
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Kode OTP salah atau email tidak ditemukan.")

    user.is_active = True
    user.otp_code = None
    db.commit()
    return {"message": "Akun berhasil diaktifkan. Silakan login."}


@app.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email atau password salah.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Akun Anda belum aktif. Silakan verifikasi OTP terlebih dahulu.")

    return {"message": "Login berhasil", "email": user.email}


@app.post("/forgot-password")
def forgot_password(data: ForgotPasswordSchema, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email.lower()).first()

    if not user:
        raise HTTPException(status_code=404, detail="Email tidak terdaftar.")

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
    user = db.query(models.User).filter(
        models.User.email == data.email.lower(),
        models.User.otp_code == data.otp,
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Kode OTP salah atau kadaluarsa.")

    return {"message": "OTP Valid! Silakan masukkan password baru."}


@app.post("/reset-password")
def reset_password(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.email == data.email.lower(),
        models.User.otp_code == data.otp,
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Kode OTP salah atau tidak valid.")

    user.hashed_password = get_password_hash(data.new_password)
    user.otp_code = None
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
        models.FinancialReport.year == data.year,
    ).first()

    if existing:
        return {"error": f"Laporan tahun {data.year} untuk {data.ticker} sudah ada."}

    new_report = models.FinancialReport(
        saham_id=saham.id,
        year=data.year,
        net_income=data.net_income,
        fcf=data.fcf,
    )
    db.add(new_report)
    db.commit()
    return {"message": f"Data {data.ticker} tahun {data.year} berhasil disimpan!"}


# === ENDPOINT BARU: Tambah Ticker ===

@app.post("/tambah-ticker")
def tambah_ticker(data: TambahTickerSchema, db: Session = Depends(get_db)):
    """
    Admin menambahkan ticker saham baru ke database.
    Config sektoral (PER, DCF, max_growth) bisa diisi manual
    atau akan diambil dari default sektor jika tidak diisi.
    """
    existing = db.query(models.Saham).filter(
        models.Saham.ticker == data.ticker.upper()
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail=f"Ticker {data.ticker.upper()} sudah ada di database.")

    # Ambil default sektor sebagai fallback
    sektor_conf = SEKTOR_DEFAULTS.get(data.sektor, SEKTOR_DEFAULTS["Lainnya"])

    new_saham = models.Saham(
        ticker=data.ticker.upper(),
        nama_emiten=data.nama_emiten,
        sektor=data.sektor,
        shares=data.shares,
        per_standard=data.per_standard if data.per_standard is not None else sektor_conf["per_standard"],
        weight_dcf=data.weight_dcf if data.weight_dcf is not None else sektor_conf["weight_dcf"],
        max_growth=data.max_growth if data.max_growth is not None else sektor_conf["max_growth"],
        manual_growth=data.manual_growth,
    )

    db.add(new_saham)
    db.commit()
    db.refresh(new_saham)

    return {
        "message": f"Ticker {data.ticker.upper()} ({data.nama_emiten}) berhasil ditambahkan!",
        "data": {
            "ticker": new_saham.ticker,
            "nama_emiten": new_saham.nama_emiten,
            "sektor": new_saham.sektor,
            "shares": new_saham.shares,
            "per_standard": new_saham.per_standard,
            "weight_dcf": new_saham.weight_dcf,
            "max_growth": new_saham.max_growth,
        },
    }


@app.put("/edit-ticker/{ticker}")
def edit_ticker(ticker: str, data: EditTickerSchema, db: Session = Depends(get_db)):
    """
    Admin mengedit config ticker yang sudah ada.
    """
    saham = db.query(models.Saham).filter(models.Saham.ticker == ticker.upper()).first()
    if not saham:
        raise HTTPException(status_code=404, detail="Ticker tidak ditemukan.")

    saham.nama_emiten = data.nama_emiten
    saham.sektor = data.sektor
    saham.shares = data.shares
    saham.per_standard = data.per_standard
    saham.weight_dcf = data.weight_dcf
    saham.max_growth = data.max_growth
    saham.manual_growth = data.manual_growth

    db.commit()
    return {"message": f"Ticker {ticker.upper()} berhasil diperbarui!"}


@app.delete("/hapus-ticker/{ticker}")
def hapus_ticker(ticker: str, db: Session = Depends(get_db)):
    """
    Admin menghapus ticker beserta seluruh laporan keuangannya.
    """
    saham = db.query(models.Saham).filter(models.Saham.ticker == ticker.upper()).first()
    if not saham:
        raise HTTPException(status_code=404, detail="Ticker tidak ditemukan.")

    # Hapus semua laporan keuangan dulu
    db.query(models.FinancialReport).filter(
        models.FinancialReport.saham_id == saham.id
    ).delete()

    db.delete(saham)
    db.commit()
    return {"message": f"Ticker {ticker.upper()} dan seluruh laporannya berhasil dihapus."}


@app.get("/cek-shares/{ticker}")
def cek_shares(ticker: str):
    """
    Auto-fetch jumlah saham beredar dari yfinance.
    Digunakan saat admin mengisi form tambah ticker.
    Return None jika tidak tersedia (admin input manual).
    """
    shares = calculator.ambil_shares_dari_yfinance(ticker)
    if shares:
        return {"ticker": ticker.upper(), "shares": shares, "source": "yfinance"}
    else:
        return {"ticker": ticker.upper(), "shares": None, "source": "manual", "message": "Data tidak tersedia di yfinance, silakan input manual."}


@app.get("/sektor-defaults")
def get_sektor_defaults():
    """
    Kembalikan daftar sektor beserta default config-nya.
    Digunakan oleh frontend untuk auto-fill form saat admin pilih sektor.
    """
    return SEKTOR_DEFAULTS


# --- 3. ANALISIS & REKOMENDASI ---

@app.get("/rekomendasi/{ticker}")
def get_rekomendasi(
    ticker: str,
    horizon: str = Query(..., pattern="^(short|mid|long)$"),
    shares: Optional[int] = None,  # Sekarang opsional, prioritas ambil dari DB
    db: Session = Depends(get_db),
):
    saham = db.query(models.Saham).filter(models.Saham.ticker == ticker.upper()).first()
    if not saham or not saham.reports:
        return {"error": f"Data laporan keuangan {ticker} belum ada di database."}

    # Ambil config dari DB (atau fallback ke legacy/default)
    conf = calculator.get_saham_config(saham)

    # Shares: prioritas dari DB, fallback ke parameter query, fallback ke 1
    jumlah_shares = saham.shares if saham.shares else (shares or 1)

    laporan_terbaru = sorted(saham.reports, key=lambda x: x.year)[-1]

    # Manual growth override dari DB atau config
    manual_growth = conf.get("manual_growth") or saham.manual_growth
    if manual_growth is not None:
        avg_growth = manual_growth
    else:
        # Kirim object saham (bukan ticker string) ke calculator
        avg_growth = calculator.hitung_growth_historis(saham.reports, saham)

    harga_dcf = calculator.hitung_dcf_pro(laporan_terbaru.fcf, avg_growth, horizon) / jumlah_shares
    harga_per = calculator.hitung_valuasi_per(laporan_terbaru.net_income, jumlah_shares, conf["per_standard"])

    w_dcf = conf["weight_dcf"]
    harga_wajar_final = (harga_dcf * w_dcf) + (harga_per * (1.0 - w_dcf))

    harga_pasar = calculator.ambil_harga_realtime(ticker)
    rekomendasi = "HOLD"
    mos = 0

    if harga_pasar:
        mos = ((harga_wajar_final - harga_pasar) / harga_wajar_final) * 100
        if mos >= 30:
            rekomendasi = "BUY"
        elif mos < 0:
            rekomendasi = "SELL"

    return {
        "ticker": ticker.upper(),
        "name": saham.nama_emiten,
        "sektor": saham.sektor,
        "shares": jumlah_shares,
        "fundamental_raw": {
            "net_income": laporan_terbaru.net_income,
            "fcf": laporan_terbaru.fcf,
            "year": laporan_terbaru.year,
        },
        "analisis": {
            "growth_digunakan": f"{round(avg_growth * 100, 2)}%",
            "harga_wajar_hybrid": round(harga_wajar_final, 2),
            "harga_pasar_saat_ini": harga_pasar,
            "margin_of_safety": f"{round(mos, 2)}%",
            "rekomendasi_akhir": rekomendasi,
        },
    }


# --- 4. DATA IHSG ---

@app.get("/ihsg-data")
def get_ihsg(range: str = "1d"):
    try:
        ihsg = yf.Ticker("^JKSE")

        if range == "1d":
            hist = ihsg.history(period="1d", interval="5m")
            fmt = "%H:%M"
        elif range == "1w":
            hist = ihsg.history(period="5d", interval="15m")
            fmt = "%d %b %H:%M"
        elif range == "1m":
            hist = ihsg.history(period="1mo", interval="1d")
            fmt = "%d %b"
        elif range == "3m":
            hist = ihsg.history(period="3mo", interval="1d")
            fmt = "%d %b"
        elif range == "1y":
            hist = ihsg.history(period="1y", interval="1d")
            fmt = "%b %Y"
        elif range == "5y":
            hist = ihsg.history(period="5y", interval="1wk")
            fmt = "%Y"
        elif range == "all":
            hist = ihsg.history(period="max", interval="1mo")
            fmt = "%Y"
        else:
            hist = ihsg.history(period="1d", interval="5m")
            fmt = "%H:%M"

        if hist.empty:
            return {"error": "Data kosong dari server Yahoo Finance."}

        current_price = hist["Close"].iloc[-1]
        prev_close = hist["Close"].iloc[0]
        change = current_price - prev_close
        percent_change = (change / prev_close) * 100

        return {
            "price": round(current_price, 2),
            "change": round(change, 2),
            "percent": round(percent_change, 2),
            "chart": hist["Close"].tolist(),
            "labels": hist.index.strftime(fmt).tolist(),
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


# --- 5. DATA CHART PER SAHAM ---

@app.get("/chart/{ticker}")
def get_stock_chart(ticker: str, range: str = "1d"):
    try:
        ticker_yf = f"{ticker.upper()}.JK"
        saham = yf.Ticker(ticker_yf)

        if range == "1d":
            hist = saham.history(period="1d", interval="5m")
            fmt = "%H:%M"
        elif range == "1w":
            hist = saham.history(period="5d", interval="15m")
            fmt = "%d %b %H:%M"
        elif range == "1m":
            hist = saham.history(period="1mo", interval="1d")
            fmt = "%d %b"
        elif range == "3m":
            hist = saham.history(period="3mo", interval="1d")
            fmt = "%d %b"
        elif range == "1y":
            hist = saham.history(period="1y", interval="1d")
            fmt = "%b %Y"
        elif range == "5y":
            hist = saham.history(period="5y", interval="1wk")
            fmt = "%Y"
        elif range == "all":
            hist = saham.history(period="max", interval="1mo")
            fmt = "%Y"
        else:
            hist = saham.history(period="1d", interval="5m")
            fmt = "%H:%M"

        if hist.empty:
            return {"error": f"Data chart untuk {ticker} tidak tersedia saat ini."}

        current_price = hist["Close"].iloc[-1]
        prev_close = hist["Close"].iloc[0]
        change = current_price - prev_close
        percent_change = (change / prev_close) * 100

        return {
            "ticker": ticker.upper(),
            "price": round(current_price, 2),
            "change": round(change, 2),
            "percent": round(percent_change, 2),
            "chart": hist["Close"].tolist(),
            "labels": hist.index.strftime(fmt).tolist(),
        }
    except Exception as e:
        return {"error": str(e)}