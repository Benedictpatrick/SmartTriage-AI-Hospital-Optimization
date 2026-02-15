"""
Synthetic Patient Data Generator – Condition-Based Probabilistic Templates.

NOT random generation. Uses disease-specific clinical templates with
realistic vitals distributions, symptom pools, severity tiers, and
demographic patterns to simulate real-world triage data.
"""
from __future__ import annotations

import random
import numpy as np
import pandas as pd
from pathlib import Path

# ── Disease Templates ───────────────────────────────────────────
DISEASE_TEMPLATES = {
    "Cardiac": {
        "weight": 0.20,
        "department": "Cardiology",
        "age_range": (40, 90),
        "gender_bias": {"Male": 0.60, "Female": 0.35, "Other": 0.05},
        "severity_distribution": {"Low": 0.15, "Medium": 0.30, "High": 0.35, "Critical": 0.20},
        "vitals": {
            "Low":      {"bp_systolic": (120,135), "bp_diastolic": (75,85),  "heart_rate": (70,90),   "spo2": (96,99), "temperature": (36.2,37.0), "respiratory_rate": (14,18)},
            "Medium":   {"bp_systolic": (140,160), "bp_diastolic": (85,100), "heart_rate": (90,115),  "spo2": (93,96), "temperature": (36.5,37.3), "respiratory_rate": (16,22)},
            "High":     {"bp_systolic": (155,180), "bp_diastolic": (95,115), "heart_rate": (110,140), "spo2": (90,94), "temperature": (36.8,37.5), "respiratory_rate": (18,26)},
            "Critical": {"bp_systolic": (170,220), "bp_diastolic": (110,130),"heart_rate": (130,170), "spo2": (80,91), "temperature": (36.0,38.0), "respiratory_rate": (22,35)},
        },
        "symptoms_pool": {
            "Low":      ["mild chest discomfort", "occasional palpitations", "slight fatigue", "shortness of breath on exertion"],
            "Medium":   ["chest tightness", "palpitations", "dizziness", "moderate chest pain", "fatigue", "shortness of breath"],
            "High":     ["severe chest pain", "radiating pain to left arm", "profuse sweating", "severe shortness of breath", "nausea", "jaw pain"],
            "Critical": ["crushing chest pain", "loss of consciousness", "severe arrhythmia", "acute dyspnea", "cyanosis", "cardiac arrest symptoms", "unresponsive"],
        },
        "conditions_pool": ["hypertension", "diabetes", "hyperlipidemia", "coronary artery disease", "atrial fibrillation", "heart failure", "smoking history", "obesity"],
    },
    "Respiratory": {
        "weight": 0.18,
        "department": "Pulmonology",
        "age_range": (20, 85),
        "gender_bias": {"Male": 0.50, "Female": 0.45, "Other": 0.05},
        "severity_distribution": {"Low": 0.25, "Medium": 0.35, "High": 0.25, "Critical": 0.15},
        "vitals": {
            "Low":      {"bp_systolic": (110,130), "bp_diastolic": (70,85),  "heart_rate": (70,90),   "spo2": (95,99), "temperature": (36.5,37.2), "respiratory_rate": (16,20)},
            "Medium":   {"bp_systolic": (115,140), "bp_diastolic": (70,90),  "heart_rate": (85,110),  "spo2": (91,95), "temperature": (37.0,38.2), "respiratory_rate": (20,26)},
            "High":     {"bp_systolic": (120,150), "bp_diastolic": (75,95),  "heart_rate": (100,130), "spo2": (85,92), "temperature": (37.5,39.0), "respiratory_rate": (24,32)},
            "Critical": {"bp_systolic": (90,160),  "bp_diastolic": (60,100), "heart_rate": (120,160), "spo2": (70,87), "temperature": (38.0,40.5), "respiratory_rate": (28,40)},
        },
        "symptoms_pool": {
            "Low":      ["mild cough", "slight wheezing", "nasal congestion", "mild sore throat"],
            "Medium":   ["persistent cough", "wheezing", "moderate dyspnea", "chest tightness", "productive cough", "low-grade fever"],
            "High":     ["severe dyspnea", "coughing blood", "high fever", "severe wheezing", "inability to speak full sentences", "pleuritic chest pain"],
            "Critical": ["acute respiratory failure", "severe cyanosis", "gasping", "altered consciousness", "respiratory arrest", "stridor"],
        },
        "conditions_pool": ["asthma", "COPD", "pneumonia history", "smoker", "tuberculosis", "lung cancer", "pulmonary fibrosis"],
    },
    "Neurological": {
        "weight": 0.12,
        "department": "Neurology",
        "age_range": (25, 90),
        "gender_bias": {"Male": 0.48, "Female": 0.47, "Other": 0.05},
        "severity_distribution": {"Low": 0.20, "Medium": 0.30, "High": 0.30, "Critical": 0.20},
        "vitals": {
            "Low":      {"bp_systolic": (110,135), "bp_diastolic": (70,85),  "heart_rate": (62,88),   "spo2": (96,99), "temperature": (36.3,37.1), "respiratory_rate": (13,18)},
            "Medium":   {"bp_systolic": (130,155), "bp_diastolic": (80,95),  "heart_rate": (75,105),  "spo2": (94,97), "temperature": (36.5,37.5), "respiratory_rate": (14,20)},
            "High":     {"bp_systolic": (150,190), "bp_diastolic": (90,115), "heart_rate": (90,130),  "spo2": (91,95), "temperature": (37.0,38.5), "respiratory_rate": (16,24)},
            "Critical": {"bp_systolic": (160,220), "bp_diastolic": (100,130),"heart_rate": (50,160),  "spo2": (85,93), "temperature": (36.0,39.0), "respiratory_rate": (10,30)},
        },
        "symptoms_pool": {
            "Low":      ["mild headache", "slight dizziness", "tingling in fingers", "mild confusion"],
            "Medium":   ["severe headache", "persistent dizziness", "numbness in limbs", "visual disturbances", "balance problems"],
            "High":     ["sudden severe headache", "one-sided weakness", "slurred speech", "facial drooping", "seizure", "vision loss"],
            "Critical": ["unresponsive", "status epilepticus", "complete paralysis", "coma", "fixed dilated pupils", "brain herniation signs"],
        },
        "conditions_pool": ["migraine", "epilepsy", "stroke history", "multiple sclerosis", "Parkinson's disease", "brain tumor", "hypertension"],
    },
    "Infection": {
        "weight": 0.20,
        "department": "Infectious Disease",
        "age_range": (5, 85),
        "gender_bias": {"Male": 0.48, "Female": 0.47, "Other": 0.05},
        "severity_distribution": {"Low": 0.30, "Medium": 0.35, "High": 0.20, "Critical": 0.15},
        "vitals": {
            "Low":      {"bp_systolic": (110,130), "bp_diastolic": (65,82), "heart_rate": (72,95),   "spo2": (96,99), "temperature": (37.2,38.0), "respiratory_rate": (14,19)},
            "Medium":   {"bp_systolic": (100,135), "bp_diastolic": (60,85), "heart_rate": (90,115),  "spo2": (93,97), "temperature": (38.0,39.0), "respiratory_rate": (17,24)},
            "High":     {"bp_systolic": (90,140),  "bp_diastolic": (55,90), "heart_rate": (110,140), "spo2": (89,94), "temperature": (39.0,40.5), "respiratory_rate": (20,28)},
            "Critical": {"bp_systolic": (70,100),  "bp_diastolic": (40,60), "heart_rate": (130,170), "spo2": (80,90), "temperature": (35.0,41.0), "respiratory_rate": (25,38)},
        },
        "symptoms_pool": {
            "Low":      ["mild fever", "body aches", "sore throat", "runny nose", "mild fatigue"],
            "Medium":   ["high fever", "chills", "body aches", "productive cough", "headache", "loss of appetite", "vomiting"],
            "High":     ["very high fever", "rigors", "confusion", "rapid breathing", "severe fatigue", "rash", "neck stiffness"],
            "Critical": ["septic shock signs", "multi-organ failure", "unresponsive", "severe hypotension", "DIC signs", "petechial rash"],
        },
        "conditions_pool": ["diabetes", "HIV", "immunosuppression", "kidney disease", "liver disease", "recent surgery", "transplant recipient"],
    },
    "Trauma": {
        "weight": 0.15,
        "department": "Surgery",
        "age_range": (10, 70),
        "gender_bias": {"Male": 0.65, "Female": 0.30, "Other": 0.05},
        "severity_distribution": {"Low": 0.25, "Medium": 0.30, "High": 0.30, "Critical": 0.15},
        "vitals": {
            "Low":      {"bp_systolic": (110,130), "bp_diastolic": (70,85),  "heart_rate": (72,95),  "spo2": (96,99), "temperature": (36.3,37.1), "respiratory_rate": (14,18)},
            "Medium":   {"bp_systolic": (100,140), "bp_diastolic": (65,90),  "heart_rate": (90,120), "spo2": (93,97), "temperature": (36.5,37.5), "respiratory_rate": (16,22)},
            "High":     {"bp_systolic": (85,130),  "bp_diastolic": (55,85),  "heart_rate": (110,145),"spo2": (88,94), "temperature": (36.0,37.8), "respiratory_rate": (18,28)},
            "Critical": {"bp_systolic": (60,90),   "bp_diastolic": (30,55),  "heart_rate": (130,180),"spo2": (75,89), "temperature": (35.0,37.5), "respiratory_rate": (22,38)},
        },
        "symptoms_pool": {
            "Low":      ["minor laceration", "mild bruising", "sprained ankle", "minor abrasion", "localized pain"],
            "Medium":   ["deep laceration", "suspected fracture", "moderate bleeding", "joint dislocation", "concussion symptoms"],
            "High":     ["compound fracture", "severe bleeding", "abdominal trauma", "head injury", "multiple fractures", "penetrating wound"],
            "Critical": ["massive hemorrhage", "traumatic brain injury", "spinal cord injury", "crush injury", "tension pneumothorax", "unresponsive"],
        },
        "conditions_pool": ["blood thinners", "osteoporosis", "hemophilia", "previous surgery", "prosthetic joint"],
    },
    "GI": {
        "weight": 0.15,
        "department": "Gastroenterology",
        "age_range": (15, 80),
        "gender_bias": {"Male": 0.48, "Female": 0.47, "Other": 0.05},
        "severity_distribution": {"Low": 0.30, "Medium": 0.35, "High": 0.25, "Critical": 0.10},
        "vitals": {
            "Low":      {"bp_systolic": (110,130), "bp_diastolic": (68,82),  "heart_rate": (68,90),   "spo2": (96,99), "temperature": (36.3,37.2), "respiratory_rate": (13,18)},
            "Medium":   {"bp_systolic": (100,135), "bp_diastolic": (60,85),  "heart_rate": (85,110),  "spo2": (94,98), "temperature": (37.0,38.5), "respiratory_rate": (15,20)},
            "High":     {"bp_systolic": (90,125),  "bp_diastolic": (55,80),  "heart_rate": (105,135), "spo2": (91,95), "temperature": (37.5,39.5), "respiratory_rate": (17,24)},
            "Critical": {"bp_systolic": (70,100),  "bp_diastolic": (40,60),  "heart_rate": (125,165), "spo2": (85,92), "temperature": (35.5,40.0), "respiratory_rate": (20,32)},
        },
        "symptoms_pool": {
            "Low":      ["mild abdominal pain", "nausea", "mild diarrhea", "bloating", "heartburn"],
            "Medium":   ["moderate abdominal pain", "persistent vomiting", "blood in stool", "severe diarrhea", "dehydration signs"],
            "High":     ["severe abdominal pain", "vomiting blood", "rigid abdomen", "severe GI bleeding", "jaundice", "acute pancreatitis symptoms"],
            "Critical": ["massive GI hemorrhage", "perforated bowel signs", "acute liver failure", "peritonitis", "hemodynamic instability", "unresponsive"],
        },
        "conditions_pool": ["peptic ulcer", "Crohn's disease", "ulcerative colitis", "liver cirrhosis", "gallstones", "pancreatitis history", "GERD", "alcohol use"],
    },
}

SEVERITY_TO_INT = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}


def _sample_vital(vrange: tuple[float, float], noise_std: float = 0.05) -> float:
    """Sample a vital value from a range with Gaussian noise."""
    lo, hi = vrange
    mean = (lo + hi) / 2
    std = (hi - lo) / 4 + noise_std
    val = np.random.normal(mean, std)
    return round(float(np.clip(val, lo - std, hi + std)), 1)


def _build_symptoms_text(symptoms: list[str]) -> str:
    """Build a natural-sounding symptom string."""
    n = random.randint(2, min(len(symptoms), 5))
    selected = random.sample(symptoms, n)
    # Add some natural language variation
    prefixes = ["patient reports", "presenting with", "complains of", "experiencing", ""]
    connectors = [", ", " and ", ", also ", " with "]
    text = random.choice(prefixes)
    if text:
        text += " "
    for i, s in enumerate(selected):
        text += s
        if i < len(selected) - 1:
            text += random.choice(connectors)
    return text.strip()


def generate_dataset(n_patients: int = 5000, missing_rate: float = 0.12, seed: int = 42) -> pd.DataFrame:
    """
    Generate synthetic patient data using condition-based probabilistic templates.

    Args:
        n_patients: Number of patients to generate.
        missing_rate: Fraction of vital values to set as missing (NaN).
        seed: Random seed for reproducibility.

    Returns:
        DataFrame with columns: age, gender, bp_systolic, bp_diastolic, heart_rate,
        spo2, temperature, respiratory_rate, symptoms_text, conditions,
        ehr_keywords, severity_label, severity_int, department_true
    """
    np.random.seed(seed)
    random.seed(seed)

    records = []
    disease_names = list(DISEASE_TEMPLATES.keys())
    disease_weights = [DISEASE_TEMPLATES[d]["weight"] for d in disease_names]

    for i in range(n_patients):
        # Pick disease category
        disease = random.choices(disease_names, weights=disease_weights, k=1)[0]
        tmpl = DISEASE_TEMPLATES[disease]

        # Pick severity tier
        sev_levels = list(tmpl["severity_distribution"].keys())
        sev_weights = list(tmpl["severity_distribution"].values())
        severity = random.choices(sev_levels, weights=sev_weights, k=1)[0]

        # Demographics
        age = random.randint(*tmpl["age_range"])
        genders = list(tmpl["gender_bias"].keys())
        gender_w = list(tmpl["gender_bias"].values())
        gender = random.choices(genders, weights=gender_w, k=1)[0]

        # Vitals
        vr = tmpl["vitals"][severity]
        vitals = {
            "bp_systolic": _sample_vital(vr["bp_systolic"]),
            "bp_diastolic": _sample_vital(vr["bp_diastolic"]),
            "heart_rate": _sample_vital(vr["heart_rate"]),
            "spo2": _sample_vital(vr["spo2"]),
            "temperature": _sample_vital(vr["temperature"], noise_std=0.1),
            "respiratory_rate": _sample_vital(vr["respiratory_rate"]),
        }

        # Introduce missing data
        vital_keys = list(vitals.keys())
        for vk in vital_keys:
            if random.random() < missing_rate:
                vitals[vk] = np.nan

        # Symptoms
        symptoms_text = _build_symptoms_text(tmpl["symptoms_pool"][severity])

        # Conditions
        n_conds = random.randint(0, min(3, len(tmpl["conditions_pool"])))
        conditions = random.sample(tmpl["conditions_pool"], n_conds)

        # Age-based severity adjustment (older patients → slightly higher risk)
        if age > 70 and severity == "Medium":
            if random.random() < 0.3:
                severity = "High"
        elif age > 80 and severity == "High":
            if random.random() < 0.2:
                severity = "Critical"

        record = {
            "patient_id": f"PAT-{i+1:05d}",
            "age": age,
            "gender": gender,
            **vitals,
            "symptoms_text": symptoms_text,
            "conditions": "|".join(conditions) if conditions else "",
            "ehr_keywords": "|".join(random.sample(
                tmpl["symptoms_pool"][severity] + tmpl["conditions_pool"],
                min(4, len(tmpl["symptoms_pool"][severity]))
            )),
            "disease_category": disease,
            "severity_label": severity,
            "severity_int": SEVERITY_TO_INT[severity],
            "department_true": tmpl["department"],
        }
        records.append(record)

    df = pd.DataFrame(records)

    # Shuffle
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)

    return df


def save_dataset(df: pd.DataFrame, path: str | Path) -> None:
    """Save dataset to CSV."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    print(f"✓ Saved {len(df)} patients to {path}")
    print(f"  Severity distribution: {df['severity_label'].value_counts().to_dict()}")
    print(f"  Department distribution: {df['department_true'].value_counts().to_dict()}")
    print(f"  Missing data rate: {df[['bp_systolic','bp_diastolic','heart_rate','spo2','temperature','respiratory_rate']].isna().mean().mean():.1%}")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
    from app.core.config import SYNTHETIC_DATA_PATH

    df = generate_dataset(n_patients=5000)
    save_dataset(df, SYNTHETIC_DATA_PATH)
