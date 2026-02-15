"""
Department Classifier – Multi-class department recommendation.

Uses symptom clustering + severity mapping + XGBoost classification.
Includes load-aware override logic for department fallbacks.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.metrics import accuracy_score, classification_report
import joblib
from pathlib import Path

from app.ml.nlp_engine import NLPSymptomEngine
from app.core.config import (
    DEPT_MODEL_PATH, TFIDF_PATH, DEPARTMENTS,
    DEPARTMENT_FALLBACKS, DEPARTMENT_OVERLOAD_THRESHOLD,
)


class DepartmentClassifier:
    """XGBoost-based department recommendation engine."""

    def __init__(self):
        self.model = XGBClassifier(
            n_estimators=150,
            max_depth=5,
            learning_rate=0.1,
            objective="multi:softprob",
            eval_metric="mlogloss",
            tree_method="hist",
            random_state=42,
            n_jobs=-1,
            missing=np.nan,
        )
        self.dept_encoder = LabelEncoder()
        self.gender_encoder = LabelEncoder()
        self.nlp_engine: NLPSymptomEngine | None = None
        self.feature_names: list[str] = []
        self._is_trained = False

    def _prepare_features(self, df: pd.DataFrame, fit: bool = False) -> np.ndarray:
        """Build feature matrix for department prediction."""

        # Numeric
        numeric_cols = ["age", "bp_systolic", "bp_diastolic",
                        "heart_rate", "spo2", "temperature", "respiratory_rate"]
        X_numeric = df[numeric_cols].values.astype(np.float64)

        # Gender
        if fit:
            gender_enc = self.gender_encoder.fit_transform(
                df["gender"].fillna("Other")
            ).reshape(-1, 1)
        else:
            gender_enc = self.gender_encoder.transform(
                df["gender"].fillna("Other")
            ).reshape(-1, 1)

        # Severity (as input feature — risk level affects department)
        severity = df["severity_int"].values.reshape(-1, 1).astype(np.float64)

        # Condition count
        cond_count = df["conditions"].apply(
            lambda x: len(str(x).split("|")) if pd.notna(x) and str(x).strip() else 0
        ).values.reshape(-1, 1)

        # NLP features
        texts = df["symptoms_text"].fillna("").tolist()
        if self.nlp_engine is None:
            self.nlp_engine = NLPSymptomEngine.load(TFIDF_PATH)
        X_nlp = self.nlp_engine.transform(texts)

        X = np.hstack([X_numeric, gender_enc, severity, cond_count, X_nlp])

        if fit:
            self.feature_names = (
                numeric_cols +
                ["gender_encoded", "severity_int", "condition_count"] +
                self.nlp_engine.get_feature_names()
            )

        return X

    def train(self, df: pd.DataFrame) -> dict:
        """Train the department classifier."""

        X = self._prepare_features(df, fit=True)
        y = self.dept_encoder.fit_transform(df["department_true"])

        self.model.set_params(num_class=len(self.dept_encoder.classes_))

        # Cross-validation
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_results = cross_validate(
            self.model, X, y,
            cv=cv,
            scoring="accuracy",
            return_train_score=True,
            n_jobs=-1,
        )

        # Full training
        self.model.fit(X, y)
        self._is_trained = True

        y_pred = self.model.predict(X)

        metrics = {
            "cv_accuracy_mean": round(float(cv_results["test_score"].mean()), 4),
            "cv_accuracy_std": round(float(cv_results["test_score"].std()), 4),
            "train_accuracy": round(float(accuracy_score(y, y_pred)), 4),
            "departments": list(self.dept_encoder.classes_),
        }

        # Save
        joblib.dump({
            "model": self.model,
            "dept_encoder": self.dept_encoder,
            "gender_encoder": self.gender_encoder,
            "feature_names": self.feature_names,
        }, DEPT_MODEL_PATH)

        print(f"✓ Department classifier trained | CV acc: {metrics['cv_accuracy_mean']:.3f} ± {metrics['cv_accuracy_std']:.3f}")
        return metrics

    def predict(self, patient_dict: dict, department_loads: dict[str, float] | None = None) -> tuple[str, str | None, np.ndarray]:
        """
        Predict department with load-aware fallback.

        Args:
            patient_dict: Single patient data dict
            department_loads: {dept_name: occupancy_fraction} e.g. {"Cardiology": 0.9}

        Returns:
            (primary_dept, fallback_dept_or_None, probabilities)
        """
        if not self._is_trained:
            raise RuntimeError("Model not trained.")

        df = pd.DataFrame([patient_dict])
        X = self._prepare_features(df, fit=False)
        probs = self.model.predict_proba(X)[0]
        pred_idx = int(np.argmax(probs))
        primary_dept = self.dept_encoder.classes_[pred_idx]

        fallback_dept = None

        # Load-aware fallback
        if department_loads:
            load = department_loads.get(primary_dept, 0)
            if load >= DEPARTMENT_OVERLOAD_THRESHOLD:
                severity = patient_dict.get("severity_int", 2)
                # Only redirect non-critical cases
                if severity < 3:  # Not Critical
                    fallbacks = DEPARTMENT_FALLBACKS.get(primary_dept, [])
                    for fb in fallbacks:
                        fb_load = department_loads.get(fb, 0)
                        if fb_load < DEPARTMENT_OVERLOAD_THRESHOLD:
                            fallback_dept = fb
                            break

        return primary_dept, fallback_dept, probs

    @classmethod
    def load(cls, path: Path | None = None) -> "DepartmentClassifier":
        """Load trained model."""
        path = path or DEPT_MODEL_PATH
        data = joblib.load(path)
        obj = cls()
        obj.model = data["model"]
        obj.dept_encoder = data["dept_encoder"]
        obj.gender_encoder = data["gender_encoder"]
        obj.feature_names = data["feature_names"]
        obj.nlp_engine = NLPSymptomEngine.load(TFIDF_PATH)
        obj._is_trained = True
        return obj
