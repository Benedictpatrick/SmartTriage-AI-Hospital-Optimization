"""
Risk Classifier – XGBoost multi-class model.

Predicts patient severity: Low (0), Medium (1), High (2), Critical (3)
Features: age, gender, 6 vitals, NLP symptom features, condition flags.
XGBoost handles missing vitals natively (NaN splits).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    roc_auc_score, precision_recall_fscore_support
)
import joblib
from pathlib import Path

from app.ml.nlp_engine import NLPSymptomEngine
from app.core.config import RISK_MODEL_PATH, TFIDF_PATH, RISK_LEVELS


class RiskClassifier:
    """XGBoost-based patient risk classifier."""

    def __init__(self):
        self.model = XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            objective="multi:softprob",
            num_class=4,
            eval_metric="mlogloss",
            tree_method="hist",    # GPU-friendly if available
            random_state=42,
            n_jobs=-1,
            enable_categorical=False,
            missing=np.nan,       # Native NaN handling
        )
        self.nlp_engine = NLPSymptomEngine(max_tfidf_features=500)
        self.gender_encoder = LabelEncoder()
        self.feature_names: list[str] = []
        self._is_trained = False

    def _prepare_features(self, df: pd.DataFrame, fit_nlp: bool = False) -> np.ndarray:
        """Build feature matrix from raw patient DataFrame."""

        # 1. Numeric features
        numeric_cols = ["age", "bp_systolic", "bp_diastolic",
                        "heart_rate", "spo2", "temperature", "respiratory_rate"]
        X_numeric = df[numeric_cols].values.astype(np.float64)

        # 2. Gender encoding
        if fit_nlp:
            gender_encoded = self.gender_encoder.fit_transform(
                df["gender"].fillna("Other")
            ).reshape(-1, 1)
        else:
            gender_encoded = self.gender_encoder.transform(
                df["gender"].fillna("Other")
            ).reshape(-1, 1)

        # 3. Condition count (simple but informative)
        condition_count = df["conditions"].apply(
            lambda x: len(str(x).split("|")) if pd.notna(x) and str(x).strip() else 0
        ).values.reshape(-1, 1)

        # 4. NLP symptom features
        texts = df["symptoms_text"].fillna("").tolist()
        if fit_nlp:
            self.nlp_engine.fit(texts)
            # Save NLP engine
            self.nlp_engine.save(TFIDF_PATH)
        X_nlp = self.nlp_engine.transform(texts)

        # Combine all features
        X = np.hstack([X_numeric, gender_encoded, condition_count, X_nlp])

        # Build feature names
        if fit_nlp:
            self.feature_names = (
                numeric_cols +
                ["gender_encoded", "condition_count"] +
                self.nlp_engine.get_feature_names()
            )

        return X

    def train(self, df: pd.DataFrame) -> dict:
        """
        Train the risk classifier with cross-validation.

        Returns dict with training metrics.
        """
        X = self._prepare_features(df, fit_nlp=True)
        y = df["severity_int"].values

        # Cross-validation
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_results = cross_validate(
            self.model, X, y,
            cv=cv,
            scoring=["accuracy", "f1_macro"],
            return_train_score=True,
            n_jobs=-1,
        )

        # Final training on full data
        self.model.fit(X, y)
        self._is_trained = True

        # Compute detailed metrics on full data (for display)
        y_pred = self.model.predict(X)
        y_prob = self.model.predict_proba(X)

        precision, recall, f1, _ = precision_recall_fscore_support(y, y_pred, average=None)
        per_class = {}
        for i, level in RISK_LEVELS.items():
            per_class[level] = {
                "precision": round(float(precision[i]), 4),
                "recall": round(float(recall[i]), 4),
                "f1": round(float(f1[i]), 4),
            }

        # AUC-ROC per class (one-vs-rest)
        auc_roc = {}
        for i, level in RISK_LEVELS.items():
            try:
                auc = roc_auc_score((y == i).astype(int), y_prob[:, i])
                auc_roc[level] = round(float(auc), 4)
            except ValueError:
                auc_roc[level] = 0.0

        # Save model
        joblib.dump(self.model, RISK_MODEL_PATH)

        metrics = {
            "cv_accuracy_mean": round(float(cv_results["test_accuracy"].mean()), 4),
            "cv_accuracy_std": round(float(cv_results["test_accuracy"].std()), 4),
            "cv_f1_macro_mean": round(float(cv_results["test_f1_macro"].mean()), 4),
            "train_accuracy": round(float(accuracy_score(y, y_pred)), 4),
            "per_class_metrics": per_class,
            "auc_roc": auc_roc,
            "confusion_matrix": confusion_matrix(y, y_pred).tolist(),
        }

        print(f"✓ Risk classifier trained | CV acc: {metrics['cv_accuracy_mean']:.3f} ± {metrics['cv_accuracy_std']:.3f}")
        return metrics

    def predict(self, df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        """
        Predict risk level for patients.

        Returns (predictions, probabilities)
        """
        if not self._is_trained:
            raise RuntimeError("Model not trained. Call train() first or load().")
        X = self._prepare_features(df, fit_nlp=False)
        preds = self.model.predict(X)
        probs = self.model.predict_proba(X)
        return preds, probs

    def predict_single(self, patient_dict: dict) -> tuple[int, np.ndarray, np.ndarray]:
        """
        Predict for a single patient.

        Returns (prediction, probabilities, feature_vector)
        """
        df = pd.DataFrame([patient_dict])
        X = self._prepare_features(df, fit_nlp=False)
        pred = self.model.predict(X)[0]
        probs = self.model.predict_proba(X)[0]
        return int(pred), probs, X[0]

    def get_feature_vector(self, patient_dict: dict) -> np.ndarray:
        """Get the feature vector for a single patient (for SHAP)."""
        df = pd.DataFrame([patient_dict])
        return self._prepare_features(df, fit_nlp=False)

    def save(self, path: Path | None = None) -> None:
        """Save the trained model."""
        path = path or RISK_MODEL_PATH
        joblib.dump({
            "model": self.model,
            "gender_encoder": self.gender_encoder,
            "feature_names": self.feature_names,
        }, path)

    @classmethod
    def load(cls, path: Path | None = None) -> "RiskClassifier":
        """Load a trained model."""
        path = path or RISK_MODEL_PATH
        data = joblib.load(path)
        obj = cls()
        obj.model = data["model"]
        obj.gender_encoder = data["gender_encoder"]
        obj.feature_names = data["feature_names"]
        obj.nlp_engine = NLPSymptomEngine.load(TFIDF_PATH)
        obj._is_trained = True
        return obj
