"""
migrate_db.py
=============
Jalankan script ini SEKALI untuk menambahkan kolom baru ke tabel 'companies'
yang sudah ada di saham.db, tanpa menghapus data lama.

Cara pakai:
    python migrate_db.py

Script ini aman dijalankan berkali-kali (akan skip jika kolom sudah ada).
"""

import sqlite3
import os

DB_PATH = "saham.db"  # Sesuaikan path jika berbeda

def kolom_exists(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    cols = [row[1] for row in cursor.fetchall()]
    return column in cols

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"❌ Database '{DB_PATH}' tidak ditemukan. Pastikan path sudah benar.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    kolom_baru = [
        ("sektor",        "TEXT"),
        ("shares",        "REAL"),
        ("per_standard",  "REAL"),
        ("weight_dcf",    "REAL"),
        ("max_growth",    "REAL"),
        ("manual_growth", "REAL"),
    ]

    print(f"🔧 Mulai migrasi database: {DB_PATH}")
    print(f"📋 Target tabel: companies\n")

    for kolom, tipe in kolom_baru:
        if kolom_exists(cursor, "companies", kolom):
            print(f"  ⏭️  Kolom '{kolom}' sudah ada, skip.")
        else:
            cursor.execute(f"ALTER TABLE companies ADD COLUMN {kolom} {tipe}")
            print(f"  ✅ Kolom '{kolom}' ({tipe}) berhasil ditambahkan.")

    conn.commit()
    conn.close()

    print("\n🎉 Migrasi selesai! Database siap digunakan.")
    print("💡 Tip: Jalankan server backend sekarang — kolom baru sudah aktif.")

if __name__ == "__main__":
    migrate()
