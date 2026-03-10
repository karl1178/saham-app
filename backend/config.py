# backend/config.py

SEKTORAL_SETTINGS = {
    "BBCA": {
        "per_standard": 22, 
        "weight_dcf": 0.5, 
        "max_growth": 0.12
    },
    "BBRI": {
        "per_standard": 15, 
        "weight_dcf": 0.5, 
        "max_growth": 0.10
    },
    "TLKM": {
        "per_standard": 15, 
        "weight_dcf": 0.4, 
        "max_growth": 0.07
    },
    "ASII": {
        "per_standard": 9,  
        "weight_dcf": 0.3, 
        "max_growth": 0.08
    },
    "ADRO": {
        "per_standard": 5,  
        "weight_dcf": 0.2, 
        "max_growth": 0.05
    },
    "UNTR": {
        "per_standard": 7,  
        "weight_dcf": 0.2, 
        "max_growth": 0.06
    }
}

DEFAULT_SETTINGS = {
    "per_standard": 10, 
    "weight_dcf": 0.4, 
    "max_growth": 0.08
}