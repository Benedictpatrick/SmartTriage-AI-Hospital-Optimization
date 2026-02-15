"""
Triage API Routes.

POST /api/triage/predict  — Full triage pipeline (intake → risk → department → explanation)
GET  /api/triage/explain   — SHAP explanation for last prediction
GET  /api/metrics          — Model comparison metrics
POST /api/ehr/extract      — Upload EHR PDF → extract structured data
"""
from __future__ import annotations

import uuid
import json
import numpy as np
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.data.schemas import PatientInput, TriageResult, ShapFeature, EHRExtractResult, RiskLevel, ProtocolExplanation
from app.api.deps import get_risk_classifier, get_dept_classifier, get_explainer, get_load_balancer
from app.core.hybrid_engine import compute_hybrid_risk
from app.core.config import DATA_DIR, RISK_LEVELS
from app.core.protocol_explainer import generate_protocol_explanation, generate_clinical_summary
from app.core.event_log import event_log

router = APIRouter(prefix="/api", tags=["triage"])


def _patient_to_dict(patient: PatientInput) -> dict:
    """Convert PatientInput to a flat dict for ML pipeline."""
    vitals = patient.vitals.model_dump()
    return {
        "age": patient.age,
        "gender": patient.gender.value,
        "bp_systolic": vitals.get("bp_systolic"),
        "bp_diastolic": vitals.get("bp_diastolic"),
        "heart_rate": vitals.get("heart_rate"),
        "spo2": vitals.get("spo2"),
        "temperature": vitals.get("temperature"),
        "respiratory_rate": vitals.get("respiratory_rate"),
        "symptoms_text": patient.symptoms_text or "",
        "conditions": "|".join(patient.conditions) if patient.conditions else "",
        "ehr_keywords": patient.ehr_text or "",
    }


@router.post("/triage/predict", response_model=TriageResult)
async def predict_triage(patient: PatientInput):
    """
    Full triage prediction pipeline.

    1. Extract features from patient data
    2. ML risk classification (XGBoost)
    3. Hybrid risk scoring (ML + Clinical Rules + Vital Index)
    4. Department recommendation (load-aware)
    5. SHAP explainability
    """
    try:
        patient_dict = _patient_to_dict(patient)
        patient_id = f"PAT-{uuid.uuid4().hex[:8].upper()}"

        # ── Step 1: ML Risk Classification ──────────────────
        rc = get_risk_classifier()
        pred_class, ml_probs, feature_vec = rc.predict_single(patient_dict)

        # ── Step 2: Hybrid Risk Engine ──────────────────────
        vitals = patient.vitals.model_dump()
        hybrid_patient = {
            "age": patient.age,
            "vitals": vitals,
            "symptoms_text": patient.symptoms_text or "",
            "conditions": patient.conditions,
        }
        hybrid = compute_hybrid_risk(ml_probs, hybrid_patient, vitals)

        # ── Step 3: Department Recommendation ───────────────
        dc = get_dept_classifier()
        lb = get_load_balancer()

        # Add severity to patient dict for dept classifier
        patient_dict["severity_int"] = pred_class
        dept_loads = lb.get_all_loads()
        primary_dept, fallback_dept, dept_probs = dc.predict(patient_dict, dept_loads)

        # Load-aware override
        final_dept, alt_dept, dept_reason = lb.recommend_department(
            primary_dept, hybrid["risk_level"] == "Critical" and 3 or pred_class
        )

        # ── Step 4: SHAP Explanation ────────────────────────
        explainer = get_explainer()
        explanation = explainer.explain(feature_vec, pred_class)

        shap_features = [
            ShapFeature(
                feature=f["feature"],
                value=f["value"] if f["value"] is not None else 0.0,
                contribution=f["contribution"],
            )
            for f in explanation["top_features"][:7]
        ]

        # ── Step 5: Protocol Explanation ────────────────────
        protocol = generate_protocol_explanation(
            hybrid=hybrid,
            department=final_dept,
            patient=hybrid_patient,
            vitals=vitals,
        )

        # ── Step 6: Clinical Summary ───────────────────────
        clinical_summary = generate_clinical_summary(
            patient={
                "age": patient.age,
                "gender": patient.gender.value,
                "symptoms_text": patient.symptoms_text or "",
            },
            vitals=vitals,
            risk_level=hybrid["risk_level"],
            risk_score=hybrid["risk_score"],
            department=final_dept,
            clinical_rules=hybrid.get("clinical_rules_triggered", []),
            guideline_references=protocol.get("guideline_references", []),
        )

        result = TriageResult(
            patient_id=patient_id,
            risk_score=hybrid["risk_score"],
            risk_level=RiskLevel(hybrid["risk_level"]),
            confidence=hybrid["confidence"],
            needs_manual_review=hybrid["needs_manual_review"],
            department=final_dept,
            department_fallback=alt_dept or fallback_dept,
            explanation=shap_features,
            explanation_text=explanation["explanation_text"],
            ml_probability=hybrid["ml_probability"],
            clinical_rule_score=hybrid["clinical_rule_score"],
            vital_abnormality_index=hybrid["vital_abnormality_index"],
            clinical_rules_triggered=hybrid.get("clinical_rules_triggered", []),
            vital_abnormals=hybrid.get("vital_abnormals", []),
            weights_used=hybrid.get("weights_used", {}),
            ml_class_probabilities=hybrid.get("ml_class_probabilities", {}),
            protocol_explanation=ProtocolExplanation(**protocol),
            clinical_summary=clinical_summary,
        )

        # ── Step 6: Log event ───────────────────────────────
        severity = "critical" if hybrid["risk_level"] in ("Critical", "High") else "info"
        event_log.add(
            event_type="triage",
            severity=severity,
            message=f"Patient {patient_id} triaged → {hybrid['risk_level']} risk ({hybrid['risk_score']:.0%}) → {final_dept}",
            patient_id=patient_id,
            metadata={
                "risk_score": hybrid["risk_score"],
                "risk_level": hybrid["risk_level"],
                "department": final_dept,
                "rules_triggered": len(hybrid.get("clinical_rules_triggered", [])),
            },
        )

        if hybrid["needs_manual_review"]:
            event_log.add(
                event_type="escalation",
                severity="warning",
                message=f"Manual review flagged for {patient_id} — confidence {hybrid['confidence']:.0%}",
                patient_id=patient_id,
            )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Triage prediction failed: {str(e)}")


@router.get("/metrics")
async def get_model_metrics():
    """Return stored model comparison metrics."""
    metrics_path = DATA_DIR / "model_metrics.json"
    if not metrics_path.exists():
        raise HTTPException(status_code=404, detail="Metrics not computed yet. Train models first.")
    with open(metrics_path) as f:
        return json.load(f)


@router.post("/ehr/extract", response_model=EHRExtractResult)
async def extract_ehr(file: UploadFile = File(...)):
    """Upload a PDF EHR document and extract structured medical data."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    from app.ml.ehr_extractor import process_ehr

    try:
        file_bytes = await file.read()
        result = process_ehr(file_bytes)
        return EHRExtractResult(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"EHR extraction failed: {str(e)}")
