from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
import random

class Saham(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, unique=True, index=True)
    nama_emiten = Column(String)
    
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
    is_active = Column(Boolean, default=False)  # Status awal tidak aktif
    otp_code = Column(String, nullable=True)     # Tempat simpan 6 digit OTP
    created_at = Column(DateTime, default=datetime.utcnow) # Waktu daftar