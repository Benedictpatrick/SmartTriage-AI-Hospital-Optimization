"""
Model Monitoring API Route.

GET /api/model/monitoring — Per-class precision/recall/F1, confusion matrix, drift indicator.

Shows production-readiness: model performance tracking + data drift detection.
Enterprise-grade thinking that separates serious teams from prototypes.
"""
from __future__ import annotations

import json
import math
from fastapi import APIRouter, HTTPException

from app.core.config import DATA_DIR
from app.core.hybrid_engine import get_prediction_distribution, get_prediction_count

router = APIRouter(prefix="/api", tags=["monitoring"])

# Training distribution (from the training data risk levels)
TRAINING_DISTRIBUTION = {
    "Low": 0.235,
    "Medium": 0.300,
    "High": 0.302,
    "Critical": 0.163,
}


def _kl_divergence(p: dict[str, float], q: dict[str, float]) -> float:
    """Compute KL divergence D(P || Q) between two distributions."""
    kl = 0.0
    for key in p:
        p_val = max(p.get(key, 0.001), 0.001)
        q_val = max(q.get(key, 0.001), 0.001)
        kl += p_val * math.log(p_val / q_val)
    return max(0.0, kl)


def _drift_status(kl_score: float) -> str:
    """Map KL divergence to human-readable drift status."""
    if kl_score < 0.05:
        return "Normal"
    elif kl_score < 0.15:
        return "Watch"
    else:
        return "Alert"


@router.get("/model/monitoring")
async def get_model_monitoring():
    """
    Return model monitoring data:
    - Per-class precision, recall, F1
    - Confusion matrix
    - Cross-validation stats
    - Data drift indicator (KL divergence of live vs training dist)
    - Live prediction distribution
    """
    metrics_path = DATA_DIR / "model_metrics.json"
    if not metrics_path.exists():
        raise HTTPException(status_code=404, detail="Model metrics not found. Train models first.")

    with open(metrics_path) as f:
        raw = json.load(f)

    risk_clf = raw.get("risk_classifier", {})

    # Per-class metrics
    per_class = risk_clf.get("per_class_metrics", {})

    # Confusion matrix
    confusion_matrix = risk_clf.get("confusion_matrix", [])

    # Cross-validation
    cv_stats = {
        "accuracy_mean": risk_clf.get("cv_accuracy_mean", 0),
        "accuracy_std": risk_clf.get("cv_accuracy_std", 0),
        "f1_macro_mean": risk_clf.get("cv_f1_macro_mean", 0),
    }

    # AUC-ROC
    auc_roc = risk_clf.get("auc_roc", {})

    # Live prediction distribution from hybrid engine tracker
    live_dist = get_prediction_distribution()
    pred_count = get_prediction_count()

    # Compute drift
    if pred_count >= 5:
        kl_score = round(_kl_divergence(live_dist, TRAINING_DISTRIBUTION), 4)
    else:
        kl_score = 0.0  # Not enough data to assess drift

    drift_status = _drift_status(kl_score)

    return {
        "per_class_metrics": per_class,
        "confusion_matrix": confusion_matrix,
        "cv_stats": cv_stats,
        "auc_roc": auc_roc,
        "model_accuracies": {
            "rule_based": raw.get("rule_based_accuracy", 0),
            "ml": raw.get("ml_accuracy", 0),
            "hybrid": raw.get("hybrid_accuracy", 0),
        },
        "drift": {
            "kl_divergence": kl_score,
            "status": drift_status,
            "prediction_count": pred_count,
            "live_distribution": live_dist,
            "training_distribution": TRAINING_DISTRIBUTION,
        },
    }
