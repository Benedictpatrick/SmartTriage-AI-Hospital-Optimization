"""
Fairness API Routes.

GET /api/fairness/report — Full fairness & bias analysis
"""
from __future__ import annotations

import json
from fastapi import APIRouter, HTTPException
from app.core.config import DATA_DIR

router = APIRouter(prefix="/api/fairness", tags=["fairness"])


@router.get("/report")
async def get_fairness_report():
    """
    Get precomputed fairness metrics.

    Computed during training and stored as JSON.
    """
    path = DATA_DIR / "fairness_metrics.json"
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail="Fairness report not yet generated. Run training pipeline first."
        )
    with open(path) as f:
        return json.load(f)
