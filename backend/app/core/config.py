"""Application configuration."""
import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"

MODELS_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

# Model files
RISK_MODEL_PATH = MODELS_DIR / "risk_classifier.joblib"
DEPT_MODEL_PATH = MODELS_DIR / "dept_classifier.joblib"
TFIDF_PATH = MODELS_DIR / "tfidf_vectorizer.joblib"
SCALER_PATH = MODELS_DIR / "feature_scaler.joblib"
RISK_EXPLAINER_PATH = MODELS_DIR / "risk_shap_explainer.joblib"

# Dataset
SYNTHETIC_DATA_PATH = DATA_DIR / "patients.csv"
METRICS_PATH = DATA_DIR / "model_metrics.json"

# Risk thresholds
CONFIDENCE_THRESHOLD = 0.60  # Below this → manual review flag
DEPARTMENT_OVERLOAD_THRESHOLD = 0.85  # 85% capacity → trigger fallback

# Hybrid risk weights
HYBRID_ML_WEIGHT = 0.6
HYBRID_RULE_WEIGHT = 0.2
HYBRID_VITAL_WEIGHT = 0.2

# Vital normal ranges (clinical reference)
VITAL_RANGES = {
    "bp_systolic":       {"low": 90,  "high": 140, "critical_low": 70,  "critical_high": 180},
    "bp_diastolic":      {"low": 60,  "high": 90,  "critical_low": 40,  "critical_high": 120},
    "heart_rate":        {"low": 60,  "high": 100, "critical_low": 40,  "critical_high": 150},
    "spo2":              {"low": 95,  "high": 100, "critical_low": 88,  "critical_high": 100},
    "temperature":       {"low": 36.1,"high": 37.2,"critical_low": 35.0,"critical_high": 39.5},
    "respiratory_rate":  {"low": 12,  "high": 20,  "critical_low": 8,   "critical_high": 30},
}

# Clinical importance weights for vital abnormality index
VITAL_WEIGHTS = {
    "bp_systolic": 0.20,
    "bp_diastolic": 0.10,
    "heart_rate": 0.20,
    "spo2": 0.25,
    "temperature": 0.10,
    "respiratory_rate": 0.15,
}

# Department configuration
DEPARTMENTS = {
    "Cardiology":          {"capacity": 15, "current_load": 0},
    "Pulmonology":         {"capacity": 12, "current_load": 0},
    "Neurology":           {"capacity": 10, "current_load": 0},
    "Emergency":           {"capacity": 20, "current_load": 0},
    "General Medicine":    {"capacity": 25, "current_load": 0},
    "Infectious Disease":  {"capacity": 12, "current_load": 0},
    "Surgery":             {"capacity": 10, "current_load": 0},
    "Gastroenterology":    {"capacity": 10, "current_load": 0},
}

# Department fallback map (primary → safe alternatives)
DEPARTMENT_FALLBACKS = {
    "Cardiology":         ["Emergency", "General Medicine"],
    "Pulmonology":        ["Emergency", "General Medicine"],
    "Neurology":          ["Emergency", "General Medicine"],
    "Emergency":          [],  # Emergency never falls back
    "General Medicine":   ["Emergency"],
    "Infectious Disease": ["General Medicine", "Emergency"],
    "Surgery":            ["Emergency"],
    "Gastroenterology":   ["General Medicine"],
}

# Risk level mapping
RISK_LEVELS = {0: "Low", 1: "Medium", 2: "High", 3: "Critical"}
RISK_COLORS = {"Low": "#22c55e", "Medium": "#eab308", "High": "#f97316", "Critical": "#ef4444"}

# Simulation
SIM_NUM_PATIENTS = 50
SIM_MEAN_ARRIVAL_INTERVAL = 120  # seconds between patient arrivals (Poisson)
