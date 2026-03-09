from sqlalchemy import Column, Integer, String, Float
from database import Base

class Saham(Base):
    __tablename__ = "data_saham"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, unique=True, index=True)
    nama_emiten = Column(String)
    fcf = Column(Float)
    growth = Column(Float)
    shares = Column(Integer)