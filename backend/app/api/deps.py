"""Shared dependencies for API routes."""
from __future__ import annotations

from functools import lru_cache
from app.ml.risk_classifier import RiskClassifier
from app.ml.dept_classifier import DepartmentClassifier
from app.ml.explainer import TriageExplainer, build_explainer
from app.simulation.load_balancer import LoadBalancer
from app.simulation.queue_sim import QueueSimulator
from app.core.config import RISK_MODEL_PATH, DEPT_MODEL_PATH, TFIDF_PATH


# ── Singletons ──────────────────────────────────────────────────
_risk_classifier: RiskClassifier | None = None
_dept_classifier: DepartmentClassifier | None = None
_explainer: TriageExplainer | None = None
_load_balancer: LoadBalancer | None = None
_simulator: QueueSimulator | None = None


def get_risk_classifier() -> RiskClassifier:
    global _risk_classifier
    if _risk_classifier is None:
        _risk_classifier = RiskClassifier.load(RISK_MODEL_PATH)
    return _risk_classifier


def get_dept_classifier() -> DepartmentClassifier:
    global _dept_classifier
    if _dept_classifier is None:
        _dept_classifier = DepartmentClassifier.load(DEPT_MODEL_PATH)
    return _dept_classifier


def get_explainer() -> TriageExplainer:
    global _explainer
    if _explainer is None:
        rc = get_risk_classifier()
        _explainer = build_explainer(rc.model, rc.feature_names)
    return _explainer


def get_load_balancer() -> LoadBalancer:
    global _load_balancer
    if _load_balancer is None:
        _load_balancer = LoadBalancer()
    return _load_balancer


def get_simulator() -> QueueSimulator:
    global _simulator
    if _simulator is None:
        _simulator = QueueSimulator(num_patients=50, speed_factor=10.0)
    return _simulator


def reload_models():
    """Force reload all models (after retraining)."""
    global _risk_classifier, _dept_classifier, _explainer
    _risk_classifier = None
    _dept_classifier = None
    _explainer = None
