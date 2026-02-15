"""
NLP Symptom Intelligence Engine.

Converts free-text symptom descriptions into medical feature vectors using:
1. TF-IDF vectorization (n-grams for medical phrases)
2. Medical keyword extraction (regex-based clinical term matching)
3. Structured feature combination
"""
from __future__ import annotations

import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from scipy.sparse import hstack, csr_matrix
import joblib
from pathlib import Path

# ── Medical Ontology (~200 clinical terms) ──────────────────────
MEDICAL_KEYWORDS = {
    # Cardiac
    "chest_pain": r"chest\s*pain|chest\s*tightness|angina|chest\s*pressure",
    "palpitations": r"palpit|irregular\s*heart|racing\s*heart|heart\s*flutter",
    "radiating_arm_pain": r"radiating.*arm|arm\s*pain|left\s*arm",
    "cardiac_arrest": r"cardiac\s*arrest|heart\s*stop",

    # Respiratory
    "dyspnea": r"dyspnea|shortness\s*of\s*breath|breathing\s*difficult|can't\s*breathe|breathless",
    "cough": r"\bcough\b|coughing",
    "wheezing": r"wheez",
    "cyanosis": r"cyanosis|blue\s*lips|blue\s*skin|bluish",
    "hemoptysis": r"coughing\s*blood|hemoptysis|blood.*sputum",
    "stridor": r"stridor",

    # Neurological
    "headache": r"headache|head\s*pain|migraine|cephalalgia",
    "seizure": r"seizure|convulsion|epilep",
    "paralysis": r"paralysis|paralyzed|weakness.*side|hemiplegia|hemiparesis",
    "slurred_speech": r"slurred\s*speech|aphasia|speech\s*difficult|dysarthria",
    "facial_droop": r"facial\s*droop|face\s*droop|bell.*palsy",
    "vision_loss": r"vision\s*loss|blind|visual\s*disturb|blurred\s*vision",
    "dizziness": r"dizz|vertigo|lightheaded",
    "confusion": r"confus|disoriented|altered\s*mental|delirium",
    "loss_of_consciousness": r"loss\s*of\s*conscious|unresponsive|passed\s*out|syncope|faint",

    # Infection/Sepsis
    "fever": r"\bfever\b|febrile|pyrexia|temperature\s*elev",
    "chills": r"chill|rigor|shiver",
    "rash": r"\brash\b|skin\s*erupt|petechial|exanthem",
    "neck_stiffness": r"neck\s*stiff|meningism|nuchal\s*rigid",
    "sepsis_signs": r"sepsis|septic|multi.*organ",

    # GI
    "abdominal_pain": r"abdominal\s*pain|belly\s*pain|stomach\s*pain|epigastric",
    "nausea": r"nausea|nauseated|queasy",
    "vomiting": r"vomit|emesis|throwing\s*up",
    "vomiting_blood": r"vomiting\s*blood|hematemesis|coffee\s*ground",
    "diarrhea": r"diarrhea|loose\s*stool|watery\s*stool",
    "gi_bleeding": r"gi\s*bleed|rectal\s*bleed|blood\s*in\s*stool|melena|hematochezia",
    "jaundice": r"jaundic|yellow\s*skin|icteric|yellow\s*eyes",
    "rigid_abdomen": r"rigid\s*abdomen|board.*abdomen|peritonit|guarding",

    # Trauma
    "fracture": r"fracture|broken\s*bone|compound\s*fracture",
    "hemorrhage": r"hemorrhag|massive\s*bleed|severe\s*bleed|exsanguinat",
    "laceration": r"lacerat|deep\s*cut|wound|gash",
    "head_injury": r"head\s*injury|head\s*trauma|concussion|tbi|traumatic\s*brain",
    "spinal_injury": r"spinal.*injury|spine.*injury|spinal\s*cord",

    # General severity markers
    "severe": r"\bsevere\b|acute|critical|extreme|intense",
    "mild": r"\bmild\b|slight|minor|little",
    "moderate": r"\bmoderate\b",
    "worsening": r"worsen|deteriorat|getting\s*worse|progressive",
    "sudden_onset": r"sudden|acute\s*onset|abrupt",
    "chronic": r"chronic|long.*standing|persistent|recurring",
    "pain": r"\bpain\b|\bpainful\b|\baching\b|\bsore\b",
    "swelling": r"swell|edema|oedema|puffy|bloat",
    "fatigue": r"fatigu|tired|exhaust|lethar|malaise|weak",
    "dehydration": r"dehydrat|dry\s*mouth|decreased\s*urine|thirst",
}

# Compile regex patterns once
_COMPILED_KEYWORDS = {
    name: re.compile(pattern, re.IGNORECASE)
    for name, pattern in MEDICAL_KEYWORDS.items()
}


class NLPSymptomEngine:
    """Converts symptom text into feature vectors for ML models."""

    def __init__(self, max_tfidf_features: int = 500):
        self.max_tfidf_features = max_tfidf_features
        self.tfidf: TfidfVectorizer | None = None
        self.keyword_names = sorted(MEDICAL_KEYWORDS.keys())
        self._is_fitted = False

    def fit(self, texts: list[str]) -> "NLPSymptomEngine":
        """Fit TF-IDF vectorizer on symptom texts."""
        self.tfidf = TfidfVectorizer(
            max_features=self.max_tfidf_features,
            ngram_range=(1, 3),
            stop_words="english",
            min_df=2,
            max_df=0.95,
            sublinear_tf=True,
        )
        self.tfidf.fit(texts)
        self._is_fitted = True
        return self

    def extract_keywords(self, text: str) -> dict[str, int]:
        """Extract binary medical keyword flags from text."""
        flags = {}
        for name, pattern in _COMPILED_KEYWORDS.items():
            flags[name] = 1 if pattern.search(text) else 0
        return flags

    def extract_keyword_vector(self, text: str) -> np.ndarray:
        """Get keyword flags as a numeric array."""
        flags = self.extract_keywords(text)
        return np.array([flags[k] for k in self.keyword_names], dtype=np.float64)

    def extract_keyword_vectors_batch(self, texts: list[str]) -> np.ndarray:
        """Batch extract keyword vectors."""
        return np.array([self.extract_keyword_vector(t) for t in texts])

    def transform_tfidf(self, texts: list[str]):
        """Transform texts to TF-IDF features."""
        if not self._is_fitted:
            raise RuntimeError("Call fit() first")
        return self.tfidf.transform(texts)

    def transform(self, texts: list[str]) -> np.ndarray:
        """
        Full transform: TF-IDF + keyword flags → combined feature matrix.
        Returns dense numpy array.
        """
        tfidf_features = self.transform_tfidf(texts)
        keyword_features = csr_matrix(self.extract_keyword_vectors_batch(texts))
        combined = hstack([tfidf_features, keyword_features])
        return combined.toarray()

    def get_feature_names(self) -> list[str]:
        """Get all feature names (TF-IDF + keywords)."""
        tfidf_names = list(self.tfidf.get_feature_names_out()) if self.tfidf else []
        return tfidf_names + [f"kw_{k}" for k in self.keyword_names]

    def save(self, path: Path) -> None:
        """Save fitted engine."""
        joblib.dump({
            "tfidf": self.tfidf,
            "keyword_names": self.keyword_names,
            "max_features": self.max_tfidf_features,
        }, path)

    @classmethod
    def load(cls, path: Path) -> "NLPSymptomEngine":
        """Load fitted engine."""
        data = joblib.load(path)
        engine = cls(max_tfidf_features=data["max_features"])
        engine.tfidf = data["tfidf"]
        engine.keyword_names = data["keyword_names"]
        engine._is_fitted = True
        return engine


def extract_top_symptoms(text: str, top_n: int = 5) -> list[str]:
    """Extract the most clinically relevant keywords found in the text."""
    found = []
    for name, pattern in _COMPILED_KEYWORDS.items():
        if pattern.search(text):
            found.append(name.replace("_", " "))
    return found[:top_n]
