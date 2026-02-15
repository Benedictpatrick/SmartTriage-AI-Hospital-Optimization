"""
SHAP Explainability Layer.

Provides feature importance explanations for triage decisions:
- Per-patient SHAP values (why this risk level?)
- Top contributing symptoms
- Natural language explanations
"""
from __future__ import annotations

import numpy as np
import shap
from xgboost import XGBClassifier
from pathlib import Path

from app.core.config import RISK_LEVELS


class TriageExplainer:
    """Wraps SHAP TreeExplainer for XGBoost risk model."""

    def __init__(self, model: XGBClassifier, feature_names: list[str]):
        self.model = model
        self.feature_names = feature_names
        self.explainer = shap.TreeExplainer(model)

    def explain(self, feature_vector: np.ndarray, predicted_class: int) -> dict:
        """
        Generate SHAP explanation for a single prediction.

        Args:
            feature_vector: Shape (1, n_features) or (n_features,)
            predicted_class: The predicted class index

        Returns:
            Dict with shap_values, top_features, explanation_text
        """
        if feature_vector.ndim == 1:
            feature_vector = feature_vector.reshape(1, -1)

        # SHAP values: shape (1, n_features, n_classes) for multi-class
        shap_values = self.explainer.shap_values(feature_vector)

        # For multi-class, shap_values is a list of arrays [class0, class1, ...]
        # or a 3D array (n_samples, n_features, n_classes)
        if isinstance(shap_values, list):
            class_shap = shap_values[predicted_class][0]
        elif shap_values.ndim == 3:
            class_shap = shap_values[0, :, predicted_class]
        else:
            class_shap = shap_values[0]

        # Get top contributing features
        abs_shap = np.abs(class_shap)
        top_indices = np.argsort(abs_shap)[::-1][:10]

        top_features = []
        for idx in top_indices:
            if abs_shap[idx] < 0.001:
                continue
            name = self.feature_names[idx] if idx < len(self.feature_names) else f"feature_{idx}"
            top_features.append({
                "feature": name,
                "value": round(float(feature_vector[0, idx]), 4) if not np.isnan(feature_vector[0, idx]) else None,
                "contribution": round(float(class_shap[idx]), 4),
            })

        # Build explanation text
        explanation_parts = []
        risk_level = RISK_LEVELS.get(predicted_class, "Unknown")
        explanation_parts.append(f"{risk_level} Risk because:")

        for feat in top_features[:5]:
            sign = "+" if feat["contribution"] > 0 else ""
            name = feat["feature"].replace("kw_", "").replace("_", " ").title()
            value_str = f"={feat['value']}" if feat["value"] is not None else ""
            explanation_parts.append(
                f"  {name}{value_str} ({sign}{feat['contribution']:.3f})"
            )

        explanation_text = "\n".join(explanation_parts)

        return {
            "predicted_class": predicted_class,
            "risk_level": risk_level,
            "top_features": top_features,
            "explanation_text": explanation_text,
            "all_shap_values": {
                self.feature_names[i]: round(float(class_shap[i]), 4)
                for i in range(min(len(class_shap), len(self.feature_names)))
                if abs(class_shap[i]) > 0.001
            },
        }

    def explain_batch(self, feature_matrix: np.ndarray, predictions: np.ndarray) -> list[dict]:
        """Explain a batch of predictions."""
        results = []
        for i in range(len(predictions)):
            result = self.explain(feature_matrix[i:i+1], int(predictions[i]))
            results.append(result)
        return results


def build_explainer(model: XGBClassifier, feature_names: list[str]) -> TriageExplainer:
    """Factory function to create a TriageExplainer."""
    return TriageExplainer(model, feature_names)
