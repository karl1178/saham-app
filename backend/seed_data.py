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

    # 3. UNTR (United Tractors) - Sektor Alat Berat/Tambang
    untr = db.query(models.Saham).filter(models.Saham.ticker == "UNTR").first()
    if not untr:
        untr = models.Saham(ticker="UNTR", nama_emiten="United Tractors")
        db.add(untr); db.flush()
        db.add_all([
            models.FinancialReport(year=2021, fcf=15e12, net_income=10.3e12, saham_id=untr.id),
            models.FinancialReport(year=2022, fcf=20e12, net_income=21.0e12, saham_id=untr.id),
            models.FinancialReport(year=2023, fcf=22e12, net_income=20.6e12, saham_id=untr.id),
            models.FinancialReport(year=2024, fcf=24e12, net_income=21.5e12, saham_id=untr.id),
        ])

    # 4. TLKM (Telkom Indonesia) - Sektor Infrastruktur Telekomunikasi
    tlkm = db.query(models.Saham).filter(models.Saham.ticker == "TLKM").first()
    if not tlkm:
        tlkm = models.Saham(ticker="TLKM", nama_emiten="Telkom Indonesia")
        db.add(tlkm); db.flush()
        db.add_all([
            models.FinancialReport(year=2021, fcf=18e12, net_income=24.3e12, saham_id=tlkm.id),
            models.FinancialReport(year=2022, fcf=16e12, net_income=20.7e12, saham_id=tlkm.id),
            models.FinancialReport(year=2023, fcf=20e12, net_income=24.5e12, saham_id=tlkm.id),
            models.FinancialReport(year=2024, fcf=22e12, net_income=25.0e12, saham_id=tlkm.id),
        ])

    # 5. BBRI (Bank Rakyat Indonesia) - Sektor Perbankan (Micro-Finance)
    bbri = db.query(models.Saham).filter(models.Saham.ticker == "BBRI").first()
    if not bbri:
        bbri = models.Saham(ticker="BBRI", nama_emiten="Bank Rakyat Indonesia")
        db.add(bbri); db.flush()
        db.add_all([
            models.FinancialReport(year=2021, fcf=32e12, net_income=32.2e12, saham_id=bbri.id),
            models.FinancialReport(year=2022, fcf=45e12, net_income=51.4e12, saham_id=bbri.id),
            models.FinancialReport(year=2023, fcf=55e12, net_income=60.4e12, saham_id=bbri.id),
            models.FinancialReport(year=2024, fcf=58e12, net_income=62.0e12, saham_id=bbri.id),
        ])

    # 6. ADRO (Adaro Energy) - Sektor Batubara
    adro = db.query(models.Saham).filter(models.Saham.ticker == "ADRO").first()
    if not adro:
        adro = models.Saham(ticker="ADRO", nama_emiten="Adaro Energy")
        db.add(adro); db.flush()
        db.add_all([
            models.FinancialReport(year=2021, fcf=12e12, net_income=13.4e12, saham_id=adro.id),
            models.FinancialReport(year=2022, fcf=35e12, net_income=38.4e12, saham_id=adro.id),
            models.FinancialReport(year=2023, fcf=25e12, net_income=25.3e12, saham_id=adro.id),
            models.FinancialReport(year=2024, fcf=20e12, net_income=22.0e12, saham_id=adro.id),
        ])

    db.commit()
    db.close()
    print("✅ Berhasil: Data historis BBCA & ASII masuk ke SQL!")

if __name__ == "__main__":
    seed()