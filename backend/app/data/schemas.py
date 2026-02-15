"""Pydantic models for the MedBrain triage system."""
from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ── Enums ───────────────────────────────────────────────────────
class RiskLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class Gender(str, Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"


# ── Input Models ────────────────────────────────────────────────
class VitalsInput(BaseModel):
    bp_systolic: Optional[float] = Field(None, description="Systolic blood pressure (mmHg)")
    bp_diastolic: Optional[float] = Field(None, description="Diastolic blood pressure (mmHg)")
    heart_rate: Optional[float] = Field(None, description="Heart rate (bpm)")
    spo2: Optional[float] = Field(None, description="Blood oxygen saturation (%)")
    temperature: Optional[float] = Field(None, description="Body temperature (°C)")
    respiratory_rate: Optional[float] = Field(None, description="Respiratory rate (breaths/min)")


class PatientInput(BaseModel):
    name: Optional[str] = Field(None, description="Patient name")
    age: int = Field(..., ge=0, le=120, description="Patient age in years")
    gender: Gender = Field(..., description="Patient gender")
    vitals: VitalsInput = Field(default_factory=VitalsInput)
    conditions: list[str] = Field(default_factory=list, description="Pre-existing conditions")
    symptoms_text: str = Field("", description="Free-text symptom description")
    ehr_text: Optional[str] = Field(None, description="Extracted EHR text (from PDF upload)")


# ── Output Models ───────────────────────────────────────────────
class ShapFeature(BaseModel):
    feature: str
    value: float
    contribution: float


class ProtocolExplanation(BaseModel):
    protocol_basis: list[str] = Field(default_factory=list, description="Clinical protocols triggered")
    vital_interpretation: list[str] = Field(default_factory=list, description="Vital sign interpretations")
    department_reasoning: str = ""
    risk_justification: str = ""
    guideline_references: list[str] = Field(default_factory=list, description="Clinical guideline references")


class TriageResult(BaseModel):
    patient_id: str
    risk_score: float = Field(..., ge=0, le=1, description="Hybrid risk score 0-1")
    risk_level: RiskLevel
    confidence: float = Field(..., ge=0, le=1)
    needs_manual_review: bool = False
    department: str
    department_fallback: Optional[str] = None
    explanation: list[ShapFeature] = Field(default_factory=list)
    explanation_text: str = ""
    ml_probability: float = 0.0
    clinical_rule_score: float = 0.0
    vital_abnormality_index: float = 0.0
    # ── Newly exposed clinical data ─────────────────────────
    clinical_rules_triggered: list[str] = Field(default_factory=list)
    vital_abnormals: list[str] = Field(default_factory=list)
    weights_used: dict = Field(default_factory=dict)
    ml_class_probabilities: dict = Field(default_factory=dict)
    protocol_explanation: Optional[ProtocolExplanation] = None
    clinical_summary: Optional[str] = None


class DepartmentStatus(BaseModel):
    name: str
    capacity: int
    current_load: int
    occupancy_pct: float
    is_overloaded: bool


class QueueEntry(BaseModel):
    patient_id: str
    patient_name: Optional[str] = None
    age: int
    risk_level: RiskLevel
    risk_score: float
    department: str
    wait_time_seconds: float = 0
    position: int = 0
    timestamp: float = 0


class EventEntry(BaseModel):
    id: str
    timestamp: float
    event_type: str  # triage, escalation, reroute, alert, system
    severity: str  # info, warning, critical
    message: str
    patient_id: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class SimulationState(BaseModel):
    tick: int
    elapsed_seconds: float
    queue: list[QueueEntry]
    departments: list[DepartmentStatus]
    processed_count: int
    total_patients: int
    risk_distribution: dict[str, int]
    impact_metrics: Optional[ImpactMetrics] = None
    scenario: str = "normal"


class ImpactMetrics(BaseModel):
    avg_wait_before_optimization: float = 0.0
    avg_wait_after_optimization: float = 0.0
    wait_time_improvement_pct: float = 0.0
    patients_rerouted: int = 0
    overload_events_prevented: int = 0
    avg_wait_by_risk: dict[str, float] = Field(default_factory=dict)
    critical_wait_optimized: float = 0.0
    critical_wait_fifo: float = 0.0
    total_processed_optimized: int = 0
    total_processed_fifo: int = 0
    throughput_improvement: int = 0


class FairnessMetrics(BaseModel):
    gender_risk_distribution: dict[str, dict[str, float]]
    age_group_fpr: dict[str, float]
    statistical_parity_diff: float
    equalized_odds_diff: float


class ModelMetrics(BaseModel):
    rule_based_accuracy: float
    ml_accuracy: float
    hybrid_accuracy: float
    per_class_metrics: dict[str, dict[str, float]]
    auc_roc: dict[str, float]


class EHRExtractResult(BaseModel):
    raw_text: str
    medications: list[str]
    diagnoses: list[str]
    allergies: list[str]
    keywords: list[str]
