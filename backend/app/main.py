"""
MedBrain – AI-Powered Smart Patient Triage System.

Main FastAPI application entry point.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import triage, queue, department, fairness, demo, events, monitoring

app = FastAPI(
    title="MedBrain – Smart Patient Triage",
    description=(
        "AI-Powered Smart Patient Triage System with Hybrid Risk Engine, "
        "SHAP Explainability, Department Load Balancing, Real-Time Queue "
        "Simulation, and Fairness Analysis."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS (allow frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(triage.router)
app.include_router(queue.router)
app.include_router(department.router)
app.include_router(fairness.router)
app.include_router(demo.router)
app.include_router(events.router)
app.include_router(monitoring.router)


@app.get("/", tags=["health"])
async def root():
    return {
        "name": "MedBrain",
        "tagline": "Intelligent Hospital Flow Optimization Engine",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["health"])
async def health():
    from app.core.config import RISK_MODEL_PATH, DEPT_MODEL_PATH
    return {
        "status": "healthy",
        "models_loaded": {
            "risk_classifier": RISK_MODEL_PATH.exists(),
            "dept_classifier": DEPT_MODEL_PATH.exists(),
        },
    }
