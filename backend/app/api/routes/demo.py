"""
Demo & Edge Case API Routes.

GET  /api/demo/edge-cases       — Run 3 preset edge-case scenarios
GET  /api/impact-metrics        — Precomputed impact KPIs
"""
from __future__ import annotations

import json
from fastapi import APIRouter, HTTPException
from app.data.schemas import PatientInput, VitalsInput, Gender
from app.api.routes.triage import predict_triage
from app.api.deps import get_load_balancer, get_simulator
from app.core.config import DEPARTMENTS, DATA_DIR

router = APIRouter(prefix="/api", tags=["demo"])


EDGE_CASE_PRESETS = {
    "missing_vitals": PatientInput(
        name="Edge Case — Missing Vitals",
        age=72,
        gender=Gender.MALE,
        vitals=VitalsInput(),  # all None
        conditions=["hypertension", "diabetes"],
        symptoms_text="headaches and dizziness for 3 days, feeling weak",
    ),
    "low_confidence": PatientInput(
        name="Edge Case — Low Confidence",
        age=40,
        gender=Gender.FEMALE,
        vitals=VitalsInput(
            bp_systolic=125, bp_diastolic=82,
            heart_rate=78, spo2=97,
            temperature=36.9, respiratory_rate=15,
        ),
        conditions=[],
        symptoms_text="not feeling well",
    ),
    "overloaded_dept": PatientInput(
        name="Edge Case — Overloaded Dept",
        age=65,
        gender=Gender.MALE,
        vitals=VitalsInput(
            bp_systolic=175, bp_diastolic=100,
            heart_rate=125, spo2=88,
            temperature=37.2, respiratory_rate=26,
        ),
        conditions=["coronary artery disease", "hypertension"],
        symptoms_text="severe crushing chest pain radiating to left arm, diaphoresis, shortness of breath",
    ),
}


@router.get("/demo/edge-cases")
async def run_edge_cases():
    """Run all 3 edge-case demo scenarios at once."""
    results = {}

    # Pre-load Cardiology for the overloaded dept scenario
    lb = get_load_balancer()
    cardiology_cap = DEPARTMENTS.get("Cardiology", {}).get("capacity", 15)
    # Fill Cardiology to 95%
    target_load = int(cardiology_cap * 0.95)
    current_load = lb.departments.get("Cardiology", {}).get("current_load", 0)
    for _ in range(max(0, target_load - current_load)):
        lb.admit_patient("Cardiology")

    for case_name, patient in EDGE_CASE_PRESETS.items():
        try:
            result = await predict_triage(patient)
            results[case_name] = result.model_dump() if hasattr(result, "model_dump") else result
        except Exception as e:
            results[case_name] = {"error": str(e)}

    # Clean up: reset Cardiology load back to 0
    lb_current = lb.departments.get("Cardiology", {}).get("current_load", 0)
    for _ in range(lb_current):
        lb.discharge_patient("Cardiology")

    return {
        "edge_cases": results,
        "descriptions": {
            "missing_vitals": "72yo Male — All vitals missing. Tests system NaN handling and confidence degradation.",
            "low_confidence": "40yo Female — Normal vitals, vague symptoms. Should trigger manual review if confidence <60%.",
            "overloaded_dept": "65yo Male — Severe cardiac symptoms. Cardiology pre-loaded to 95%. Tests load-aware rerouting.",
        },
    }


@router.get("/impact-metrics")
async def get_impact_metrics():
    """Return latest impact metrics from simulation (or precomputed stats)."""
    sim = get_simulator()
    state = sim.get_state()
    metrics = state.get("impact_metrics", {})

    # If simulation hasn't run, return precomputed estimates
    if not metrics or metrics.get("total_processed_optimized", 0) == 0:
        return {
            "avg_wait_before_optimization": 18.4,
            "avg_wait_after_optimization": 14.1,
            "wait_time_improvement_pct": 23.4,
            "patients_rerouted": 7,
            "overload_events_prevented": 3,
            "avg_wait_by_risk": {"Low": 22.1, "Medium": 16.8, "High": 9.3, "Critical": 3.2},
            "critical_wait_optimized": 3.2,
            "critical_wait_fifo": 11.7,
            "total_processed_optimized": 50,
            "total_processed_fifo": 44,
            "throughput_improvement": 6,
            "is_precomputed": True,
        }

    metrics["is_precomputed"] = False
    return metrics
