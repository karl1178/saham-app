from database import SessionLocal, engine
import models

# 1. Pastikan tabel sudah terbuat
models.Base.metadata.create_all(bind=engine)

def seed():
    db = SessionLocal()
    
    # Data 1: BBCA (Bank Central Asia)
    bbca = db.query(models.Saham).filter(models.Saham.ticker == "BBCA").first()
    if not bbca:
        bbca = models.Saham(ticker="BBCA", nama_emiten="Bank Central Asia")
        db.add(bbca)
        db.flush() # Agar kita dapat ID-nya untuk relasi

        laporan_bbca = [
            models.FinancialReport(year=2021, fcf=30e12, net_income=31.4e12, saham_id=bbca.id),
            models.FinancialReport(year=2022, fcf=36e12, net_income=40.7e12, saham_id=bbca.id),
            models.FinancialReport(year=2023, fcf=44e12, net_income=48.6e12, saham_id=bbca.id),
            models.FinancialReport(year=2024, fcf=50e12, net_income=53.2e12, saham_id=bbca.id),
        ]
        db.add_all(laporan_bbca)

    # Data 2: ASII (Astra International)
    asii = db.query(models.Saham).filter(models.Saham.ticker == "ASII").first()
    if not asii:
        asii = models.Saham(ticker="ASII", nama_emiten="Astra International")
        db.add(asii)
        db.flush()

        laporan_asii = [
            models.FinancialReport(year=2021, fcf=15e12, net_income=20.1e12, saham_id=asii.id),
            models.FinancialReport(year=2022, fcf=22e12, net_income=28.9e12, saham_id=asii.id),
            models.FinancialReport(year=2023, fcf=25e12, net_income=33.8e12, saham_id=asii.id),
            models.FinancialReport(year=2024, fcf=28e12, net_income=34.0e12, saham_id=asii.id),
        ]
        db.add_all(laporan_asii)

    db.commit()
    db.close()
    print("✅ Berhasil: Data historis BBCA & ASII masuk ke SQL!")

if __name__ == "__main__":
    seed()