# backend/config.py

# ============================================================
# SEKTOR_DEFAULTS: Default config per sektor BEI
# Digunakan saat admin tambah ticker baru.
# Admin bisa override nilai-nilai ini per ticker.
# ============================================================
SEKTOR_DEFAULTS = {
    "Perbankan": {
        "per_standard": 12,
        "weight_dcf": 0.5,
        "max_growth": 0.12,
    },
    "Energi & Tambang": {
        "per_standard": 6,
        "weight_dcf": 0.3,
        "max_growth": 0.08,
    },
    "Telekomunikasi": {
        "per_standard": 15,
        "weight_dcf": 0.4,
        "max_growth": 0.07,
    },
    "Consumer Goods": {
        "per_standard": 18,
        "weight_dcf": 0.5,
        "max_growth": 0.10,
    },
    "Infrastruktur": {
        "per_standard": 14,
        "weight_dcf": 0.4,
        "max_growth": 0.08,
    },
    "Properti": {
        "per_standard": 10,
        "weight_dcf": 0.35,
        "max_growth": 0.08,
    },
    "Teknologi": {
        "per_standard": 25,
        "weight_dcf": 0.6,
        "max_growth": 0.15,
    },
    "Industri & Manufaktur": {
        "per_standard": 9,
        "weight_dcf": 0.35,
        "max_growth": 0.08,
    },
    "Healthcare": {
        "per_standard": 20,
        "weight_dcf": 0.5,
        "max_growth": 0.12,
    },
    "Lainnya": {
        "per_standard": 10,
        "weight_dcf": 0.4,
        "max_growth": 0.08,
    },
}

# ============================================================
# SEKTORAL_SETTINGS: Config manual per-ticker (legacy)
# Masih digunakan sebagai fallback untuk ticker lama
# yang belum punya data sektor di database.
# ============================================================
SEKTORAL_SETTINGS = {
    "BBCA": {
        "per_standard": 22,
        "weight_dcf": 0.5,
        "max_growth": 0.50,
        "manual_growth": None,
    },
    "BBRI": {
        "per_standard": 15,
        "weight_dcf": 0.5,
        "max_growth": 0.10,
        "manual_growth": None,
    },
    "TLKM": {
        "per_standard": 15,
        "weight_dcf": 0.4,
        "max_growth": 0.07,
        "manual_growth": None,
    },
    "ASII": {
        "per_standard": 9,
        "weight_dcf": 0.3,
        "max_growth": 0.08,
        "manual_growth": None,
    },
    "ADRO": {
        "per_standard": 5,
        "weight_dcf": 0.2,
        "max_growth": 0.05,
        "manual_growth": None,
    },
    "UNTR": {
        "per_standard": 7,
        "weight_dcf": 0.2,
        "max_growth": 0.06,
        "manual_growth": None,
    },
}

DEFAULT_SETTINGS = {
    "per_standard": 10,
    "weight_dcf": 0.4,
    "max_growth": 0.08,
    "manual_growth": None,
}