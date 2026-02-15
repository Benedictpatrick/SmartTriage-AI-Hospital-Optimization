"""
Department API Routes.

GET  /api/department/load      — Current department occupancies
POST /api/department/recommend — Load-aware department recommendation
POST /api/department/admit     — Admit patient to department
POST /api/department/discharge — Discharge patient from department
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.api.deps import get_load_balancer

router = APIRouter(prefix="/api/department", tags=["department"])


class DeptRecommendRequest(BaseModel):
    primary_department: str
    severity_int: int  # 0=Low, 1=Med, 2=High, 3=Critical


class DeptActionRequest(BaseModel):
    department: str


@router.get("/load")
async def get_department_loads():
    """Get current department occupancy status."""
    lb = get_load_balancer()
    return {
        "departments": lb.get_status(),
        "overload_threshold": 0.85,
    }


@router.post("/recommend")
async def recommend_department(req: DeptRecommendRequest):
    """Get load-aware department recommendation with fallback."""
    lb = get_load_balancer()
    final, fallback, reason = lb.recommend_department(
        req.primary_department, req.severity_int
    )
    return {
        "recommended_department": final,
        "original_department": req.primary_department,
        "fallback_department": fallback,
        "reason": reason,
        "loads": lb.get_all_loads(),
    }


@router.post("/admit")
async def admit_patient(req: DeptActionRequest):
    """Admit a patient to a department."""
    lb = get_load_balancer()
    success = lb.admit_patient(req.department)
    if not success:
        raise HTTPException(status_code=409, detail=f"{req.department} is at full capacity")
    return {"status": "admitted", "department": req.department, "loads": lb.get_all_loads()}


@router.post("/discharge")
async def discharge_patient(req: DeptActionRequest):
    """Discharge a patient from a department."""
    lb = get_load_balancer()
    success = lb.discharge_patient(req.department)
    if not success:
        raise HTTPException(status_code=400, detail=f"No patients in {req.department}")
    return {"status": "discharged", "department": req.department, "loads": lb.get_all_loads()}
