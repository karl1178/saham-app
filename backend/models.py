from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class Saham(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, unique=True, index=True)
    nama_emiten = Column(String)

    # === KOLOM BARU ===
    sektor = Column(String, nullable=True)           # Nama sektor BEI
    shares = Column(Float, nullable=True)            # Jumlah saham beredar
    per_standard = Column(Float, nullable=True)      # PER standar sektor (bisa di-override)
    weight_dcf = Column(Float, nullable=True)        # Bobot DCF (bisa di-override)
    max_growth = Column(Float, nullable=True)        # Max growth cap (bisa di-override)
    manual_growth = Column(Float, nullable=True)     # Manual growth override (opsional)

    # Relasi ke tabel laporan keuangan
    reports = relationship("FinancialReport", back_populates="owner")


class FinancialReport(Base):
    __tablename__ = "financial_reports"
    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer)
    fcf = Column(Float)
    net_income = Column(Float)
    saham_id = Column(Integer, ForeignKey("companies.id"))

    owner = relationship("Saham", back_populates="reports")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=False)
    otp_code = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)