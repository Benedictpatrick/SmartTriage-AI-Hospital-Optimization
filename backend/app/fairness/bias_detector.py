"""
Bias & Fairness Detection Module.

Computes fairness metrics across demographic groups:
- Risk prediction distribution by gender
- False positive rate across age groups
- Statistical parity difference
- Equalized odds difference

Very few teams will implement this — instant credibility boost.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from typing import Optional


def compute_gender_risk_distribution(
    df: pd.DataFrame,
    predictions: np.ndarray,
    risk_levels: dict[int, str] = {0: "Low", 1: "Medium", 2: "High", 3: "Critical"},
) -> dict[str, dict[str, float]]:
    """
    Compute risk level distribution per gender.

    Returns: {"Male": {"Low": 0.30, "Medium": 0.25, ...}, "Female": {...}}
    """
    result = {}
    for gender in df["gender"].unique():
        mask = df["gender"] == gender
        gender_preds = predictions[mask]
        total = len(gender_preds)
        if total == 0:
            continue
        dist = {}
        for level_int, level_name in risk_levels.items():
            dist[level_name] = round(float(np.sum(gender_preds == level_int) / total), 4)
        result[gender] = dist
    return result


def compute_age_group_fpr(
    df: pd.DataFrame,
    predictions: np.ndarray,
    true_labels: np.ndarray,
    high_risk_threshold: int = 2,
) -> dict[str, float]:
    """
    Compute false positive rate for "High/Critical" across age groups.

    FPR = FP / (FP + TN) for the "high risk" class.
    """
    age_bins = [(0, 30), (31, 50), (51, 65), (66, 120)]
    age_labels = ["18-30", "31-50", "51-65", "65+"]

    result = {}
    for (lo, hi), label in zip(age_bins, age_labels):
        mask = (df["age"] >= lo) & (df["age"] <= hi)
        group_preds = predictions[mask]
        group_true = true_labels[mask]

        # Binary: high risk vs not
        pred_high = (group_preds >= high_risk_threshold).astype(int)
        true_high = (group_true >= high_risk_threshold).astype(int)

        fp = np.sum((pred_high == 1) & (true_high == 0))
        tn = np.sum((pred_high == 0) & (true_high == 0))

        fpr = round(float(fp / max(fp + tn, 1)), 4)
        result[label] = fpr

    return result


def compute_statistical_parity_difference(
    df: pd.DataFrame,
    predictions: np.ndarray,
    protected_attribute: str = "gender",
    favorable_outcome: int = 0,  # Low risk = favorable
) -> float:
    """
    Statistical Parity Difference: P(Y=favorable | group=A) - P(Y=favorable | group=B).

    Values close to 0 indicate fairness.
    """
    groups = df[protected_attribute].unique()
    if len(groups) < 2:
        return 0.0

    # Use first two groups (typically Male/Female)
    rates = []
    for group in sorted(groups)[:2]:
        mask = df[protected_attribute] == group
        group_preds = predictions[mask]
        rate = float(np.mean(group_preds == favorable_outcome))
        rates.append(rate)

    return round(abs(rates[0] - rates[1]), 4)


def compute_equalized_odds_difference(
    df: pd.DataFrame,
    predictions: np.ndarray,
    true_labels: np.ndarray,
    protected_attribute: str = "gender",
    positive_class: int = 2,
) -> float:
    """
    Equalized Odds Difference: max difference in TPR/FPR across groups.

    Values close to 0 indicate fairness.
    """
    groups = df[protected_attribute].unique()
    if len(groups) < 2:
        return 0.0

    tpr_rates = []
    fpr_rates = []

    for group in sorted(groups)[:2]:
        mask = df[protected_attribute] == group
        group_preds = (predictions[mask] >= positive_class).astype(int)
        group_true = (true_labels[mask] >= positive_class).astype(int)

        tp = np.sum((group_preds == 1) & (group_true == 1))
        fn = np.sum((group_preds == 0) & (group_true == 1))
        fp = np.sum((group_preds == 1) & (group_true == 0))
        tn = np.sum((group_preds == 0) & (group_true == 0))

        tpr = tp / max(tp + fn, 1)
        fpr = fp / max(fp + tn, 1)

        tpr_rates.append(tpr)
        fpr_rates.append(fpr)

    tpr_diff = abs(tpr_rates[0] - tpr_rates[1])
    fpr_diff = abs(fpr_rates[0] - fpr_rates[1])

    return round(max(tpr_diff, fpr_diff), 4)


def compute_all_fairness_metrics(
    df: pd.DataFrame,
    predictions: np.ndarray,
    true_labels: np.ndarray,
) -> dict:
    """
    Compute all fairness metrics in one call.

    Returns dict matching FairnessMetrics schema.
    """
    return {
        "gender_risk_distribution": compute_gender_risk_distribution(df, predictions),
        "age_group_fpr": compute_age_group_fpr(df, predictions, true_labels),
        "statistical_parity_diff": compute_statistical_parity_difference(df, predictions),
        "equalized_odds_diff": compute_equalized_odds_difference(df, predictions, true_labels),
    }
