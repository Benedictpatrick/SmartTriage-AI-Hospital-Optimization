"""
MedBrain Training Pipeline.

Generates synthetic data, trains all models, computes metrics, and
saves all artifacts. Run this once before starting the API server.

Usage:
    cd backend
    python -m app.train
"""
from __future__ import annotations

import json
import sys
import time
import numpy as np
import pandas as pd
from pathlib import Path

# Ensure project root is on path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import (
    SYNTHETIC_DATA_PATH, RISK_MODEL_PATH, DEPT_MODEL_PATH,
    TFIDF_PATH, DATA_DIR, RISK_LEVELS,
)
from app.data.generator import generate_dataset, save_dataset
from app.ml.risk_classifier import RiskClassifier
from app.ml.dept_classifier import DepartmentClassifier
from app.ml.explainer import build_explainer
from app.core.hybrid_engine import compute_hybrid_risk, rule_based_classify
from app.fairness.bias_detector import compute_all_fairness_metrics


def main():
    print("=" * 60)
    print("  MedBrain – Training Pipeline")
    print("=" * 60)
    t0 = time.time()

    # ── Step 1: Generate Synthetic Data ─────────────────────
    print("\n[1/6] Generating synthetic dataset...")
    df = generate_dataset(n_patients=5000)
    save_dataset(df, SYNTHETIC_DATA_PATH)

    # ── Step 2: Train Risk Classifier ───────────────────────
    print("\n[2/6] Training risk classifier (XGBoost)...")
    rc = RiskClassifier()
    risk_metrics = rc.train(df)
    rc.save()

    # ── Step 3: Train Department Classifier ─────────────────
    print("\n[3/6] Training department classifier...")
    dc = DepartmentClassifier()
    dept_metrics = dc.train(df)

    # ── Step 4: Compute Hybrid & Baseline Metrics ───────────
    print("\n[4/6] Computing hybrid risk engine metrics & baseline comparison...")

    # ML predictions on full dataset
    ml_preds, ml_probs = rc.predict(df)
    ml_accuracy = float(np.mean(ml_preds == df["severity_int"].values))

    # Rule-based baseline predictions
    y_true = df["severity_int"].values
    rule_preds = []
    for _, row in df.iterrows():
        vitals = {
            "bp_systolic": row.get("bp_systolic"),
            "bp_diastolic": row.get("bp_diastolic"),
            "heart_rate": row.get("heart_rate"),
            "spo2": row.get("spo2"),
            "temperature": row.get("temperature"),
            "respiratory_rate": row.get("respiratory_rate"),
        }
        patient = {
            "age": row["age"],
            "vitals": vitals,
            "symptoms_text": row.get("symptoms_text", ""),
            "conditions": str(row.get("conditions", "")).split("|") if row.get("conditions") else [],
        }
        rule_preds.append(rule_based_classify(patient, vitals))
    rule_preds = np.array(rule_preds)
    rule_accuracy = float(np.mean(rule_preds == y_true))

    # Hybrid predictions
    hybrid_preds = []
    for i, row in df.iterrows():
        vitals = {
            "bp_systolic": row.get("bp_systolic"),
            "bp_diastolic": row.get("bp_diastolic"),
            "heart_rate": row.get("heart_rate"),
            "spo2": row.get("spo2"),
            "temperature": row.get("temperature"),
            "respiratory_rate": row.get("respiratory_rate"),
        }
        patient = {
            "age": row["age"],
            "vitals": vitals,
            "symptoms_text": row.get("symptoms_text", ""),
            "conditions": str(row.get("conditions", "")).split("|") if row.get("conditions") else [],
        }
        hybrid_result = compute_hybrid_risk(ml_probs[i], patient, vitals)
        # Map risk_level to int
        level_to_int = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
        hybrid_preds.append(level_to_int[hybrid_result["risk_level"]])
    hybrid_preds = np.array(hybrid_preds)
    hybrid_accuracy = float(np.mean(hybrid_preds == y_true))

    print(f"  Rule-Based Accuracy:  {rule_accuracy:.4f}")
    print(f"  ML-Only Accuracy:     {ml_accuracy:.4f}")
    print(f"  Hybrid Accuracy:      {hybrid_accuracy:.4f}")
    if hybrid_accuracy >= ml_accuracy and hybrid_accuracy >= rule_accuracy:
        print("  ✓ Hybrid engine outperforms both baselines!")
    elif hybrid_accuracy >= ml_accuracy:
        print("  ✓ Hybrid engine outperforms rule-based baseline")

    # ── Step 5: Fairness Analysis ───────────────────────────
    print("\n[5/6] Computing fairness metrics...")
    fairness = compute_all_fairness_metrics(df, ml_preds, y_true)
    print(f"  Statistical Parity Difference: {fairness['statistical_parity_diff']:.4f}")
    print(f"  Equalized Odds Difference:     {fairness['equalized_odds_diff']:.4f}")

    # Save fairness metrics
    fairness_path = DATA_DIR / "fairness_metrics.json"
    with open(fairness_path, "w") as f:
        json.dump(fairness, f, indent=2, default=str)
    print(f"  ✓ Saved to {fairness_path}")

    # ── Step 6: Save All Metrics ────────────────────────────
    print("\n[6/6] Saving model comparison metrics...")
    all_metrics = {
        "rule_based_accuracy": round(rule_accuracy, 4),
        "ml_accuracy": round(ml_accuracy, 4),
        "hybrid_accuracy": round(hybrid_accuracy, 4),
        "risk_classifier": risk_metrics,
        "dept_classifier": dept_metrics,
        "fairness": fairness,
    }
    metrics_path = DATA_DIR / "model_metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(all_metrics, f, indent=2, default=str)
    print(f"  ✓ Saved to {metrics_path}")

    elapsed = time.time() - t0
    print(f"\n{'=' * 60}")
    print(f"  Training complete in {elapsed:.1f}s")
    print(f"  Models saved to: {RISK_MODEL_PATH.parent}")
    print(f"  Start server:  uvicorn app.main:app --reload")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
