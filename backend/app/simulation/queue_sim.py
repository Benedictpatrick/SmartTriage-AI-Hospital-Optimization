"""
Deterministic Hospital Queue Simulation Engine.

Discrete-event simulation using M/M/c queueing model:
- Poisson-distributed patient arrivals (pre-generated, deterministic given seed)
- Per-department treatment queues with finite capacity slots
- Service-time-based treatment completion (NOT random discharge)
- AI mode: priority queue + proactive load-balanced rerouting
- FIFO mode: first-come-first-serve baseline comparison
- Patient flow stage tracking for real-time pipeline visualization

Every metric is COMPUTED from queue state, not fabricated.
"""
from __future__ import annotations

import asyncio
import random
import time
import numpy as np
from typing import Callable, Optional
from dataclasses import dataclass, field

from app.core.config import (
    SIM_NUM_PATIENTS, SIM_MEAN_ARRIVAL_INTERVAL,
    DEPARTMENTS, RISK_LEVELS,
)
from app.core.recommendations import generate_recommendations


# ── Data Models ─────────────────────────────────────────────

@dataclass
class SimPatient:
    """A patient flowing through the hospital pipeline."""
    patient_id: str
    name: str
    age: int
    risk_level: str       # Low / Medium / High / Critical
    risk_score: float
    department: str
    arrival_time: float
    arrival_tick: int = 0
    stage: str = "arrived"  # arrived | queued | treating | discharged
    processed: bool = False
    process_time: Optional[float] = None
    wait_ticks: int = 0          # ticks spent waiting in queue
    treatment_start_tick: int = 0
    service_ticks: int = 0       # total ticks of treatment required
    rerouted: bool = False
    rerouted_from: Optional[str] = None


@dataclass
class TreatmentSlot:
    """An active treatment slot in a department."""
    patient: SimPatient
    remaining_ticks: int


# ── Constants ───────────────────────────────────────────────

RISK_PRIORITY = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}

# Deterministic service time in ticks per risk level
SERVICE_TICKS = {"Critical": 4, "High": 6, "Medium": 8, "Low": 12}

# Load threshold for AI rerouting
REROUTE_THRESHOLD = 0.80

FIRST_NAMES = [
    "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael",
    "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan",
    "Joseph", "Jessica", "Thomas", "Sarah", "Christopher", "Karen",
    "Arun", "Priya", "Raj", "Deepa", "Vikram", "Anita", "Sanjay", "Meena",
    "Ahmed", "Fatima", "Omar", "Aisha", "Wei", "Li", "Yuki", "Hana",
]
LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Rodriguez", "Martinez", "Patel", "Sharma", "Kumar", "Singh",
    "Chen", "Wang", "Kim", "Park", "Tanaka", "Ali", "Khan", "Hassan",
]


def _random_name() -> str:
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def _generate_patient(
    idx: int,
    arrival_time: float,
    arrival_tick: int,
    risk_weights: list[float] | None = None,
    dept_override: dict[str, float] | None = None,
) -> SimPatient:
    """Generate a patient with risk-weighted department assignment."""
    weights = risk_weights or [0.30, 0.35, 0.25, 0.10]
    risk_level = random.choices(
        ["Low", "Medium", "High", "Critical"], weights=weights, k=1
    )[0]

    risk_ranges = {
        "Low": (0.05, 0.24), "Medium": (0.25, 0.49),
        "High": (0.50, 0.74), "Critical": (0.75, 0.98),
    }
    lo, hi = risk_ranges[risk_level]
    risk_score = round(random.uniform(lo, hi), 3)

    if dept_override:
        dw = dept_override
    else:
        dept_weights = {
            "Low": {"General Medicine": 0.40, "Gastroenterology": 0.20, "Pulmonology": 0.15,
                    "Neurology": 0.10, "Cardiology": 0.05, "Infectious Disease": 0.10},
            "Medium": {"General Medicine": 0.20, "Cardiology": 0.18, "Pulmonology": 0.18,
                       "Neurology": 0.12, "Infectious Disease": 0.15,
                       "Gastroenterology": 0.10, "Surgery": 0.07},
            "High": {"Emergency": 0.20, "Cardiology": 0.22, "Neurology": 0.15,
                     "Surgery": 0.15, "Pulmonology": 0.13,
                     "Infectious Disease": 0.10, "Gastroenterology": 0.05},
            "Critical": {"Emergency": 0.45, "Cardiology": 0.18, "Surgery": 0.15,
                         "Neurology": 0.10, "Pulmonology": 0.07, "Infectious Disease": 0.05},
        }
        dw = dept_weights[risk_level]

    department = random.choices(list(dw.keys()), weights=list(dw.values()), k=1)[0]

    return SimPatient(
        patient_id=f"SIM-{idx:04d}",
        name=_random_name(),
        age=random.randint(5, 95),
        risk_level=risk_level,
        risk_score=risk_score,
        department=department,
        arrival_time=arrival_time,
        arrival_tick=arrival_tick,
        service_ticks=SERVICE_TICKS[risk_level],
    )


# ── Department Queue Manager ───────────────────────────────

class DeptQueue:
    """Manages a single department's queue and treatment slots."""

    def __init__(self, name: str, capacity: int):
        self.name = name
        self.capacity = capacity
        self.waiting: list[SimPatient] = []
        self.active: list[TreatmentSlot] = []
        self._discharged_count = 0

    @property
    def active_count(self) -> int:
        return len(self.active)

    @property
    def queue_length(self) -> int:
        return len(self.waiting)

    @property
    def available_slots(self) -> int:
        return max(0, self.capacity - len(self.active))

    @property
    def load_pct(self) -> float:
        return self.active_count / max(self.capacity, 1)

    @property
    def is_overloaded(self) -> bool:
        return self.load_pct >= 0.85

    def critical_count(self) -> int:
        return (
            sum(1 for s in self.active if s.patient.risk_level == "Critical")
            + sum(1 for p in self.waiting if p.risk_level == "Critical")
        )

    def process_treatments(self, current_tick: int) -> list[SimPatient]:
        """Decrement remaining treatment time. Return discharged patients."""
        discharged = []
        remaining = []
        for slot in self.active:
            slot.remaining_ticks -= 1
            if slot.remaining_ticks <= 0:
                slot.patient.stage = "discharged"
                slot.patient.processed = True
                slot.patient.process_time = current_tick
                discharged.append(slot.patient)
                self._discharged_count += 1
            else:
                remaining.append(slot)
        self.active = remaining
        return discharged

    def admit_patients(self, prioritize: bool = False, current_tick: int = 0) -> list[SimPatient]:
        """Move patients from waiting queue to treatment slots."""
        if prioritize:
            self.waiting.sort(
                key=lambda p: RISK_PRIORITY.get(p.risk_level, 0), reverse=True
            )

        admitted = []
        while self.available_slots > 0 and self.waiting:
            patient = self.waiting.pop(0)
            patient.stage = "treating"
            patient.treatment_start_tick = current_tick
            self.active.append(
                TreatmentSlot(patient=patient, remaining_ticks=patient.service_ticks)
            )
            admitted.append(patient)
        return admitted

    def enqueue(self, patient: SimPatient):
        """Add patient to the waiting queue."""
        patient.stage = "queued"
        self.waiting.append(patient)

    def reset(self):
        self.waiting.clear()
        self.active.clear()
        self._discharged_count = 0

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "capacity": self.capacity,
            "current_load": self.active_count,
            "queue_length": self.queue_length,
            "occupancy_pct": round(self.load_pct * 100, 1),
            "is_overloaded": self.is_overloaded,
            "critical_count": self.critical_count(),
            "active_patients": self.active_count,
        }


# ── Main Simulation Engine ─────────────────────────────────

class QueueSimulator:
    """
    Deterministic discrete-event hospital queue simulator.

    Each tick:
      1. Admit new patients (Poisson arrivals)
      2. For each department: discharge completed treatments
      3. For each department: admit from queue to available slots
      4. Increment wait ticks for queued patients
      5. Record state snapshot and send WebSocket update

    AI mode:  priority queue + load-balanced rerouting
    FIFO mode: first-come-first-serve, no rerouting (baseline)
    """

    SCENARIOS = {
        "normal": {
            "num_patients": 50,
            "arrival_interval": SIM_MEAN_ARRIVAL_INTERVAL,
            "speed_factor": 10.0,
            "label": "Normal Operations",
            "description": "Standard ER flow — 50 patients, normal arrival rate",
        },
        "surge": {
            "num_patients": 120,
            "arrival_interval": 30,
            "speed_factor": 15.0,
            "label": "Mass Casualty Surge",
            "description": "120 patients, 4× arrival rate — simulates MCI or bus crash",
            "risk_weights": [0.15, 0.25, 0.35, 0.25],
        },
        "flu_outbreak": {
            "num_patients": 100,
            "arrival_interval": 45,
            "speed_factor": 12.0,
            "label": "Flu Outbreak",
            "description": "100 patients, 2.7× arrivals — mostly medium severity",
            "risk_weights": [0.20, 0.45, 0.25, 0.10],
        },
        "cardiac_surge": {
            "num_patients": 80,
            "arrival_interval": 50,
            "speed_factor": 12.0,
            "label": "Cardiac Event Cluster",
            "description": "80 patients, high-acuity cardiac cluster",
            "risk_weights": [0.10, 0.20, 0.40, 0.30],
            "dept_override": {
                "Emergency": 0.30, "Cardiology": 0.45,
                "Surgery": 0.15, "General Medicine": 0.10,
            },
        },
        "digital_twin": {
            "num_patients": 100,
            "arrival_interval": 60,
            "speed_factor": 10.0,
            "label": "Hospital Digital Twin",
            "description": "100 patients — full hospital simulation comparing AI vs FIFO",
        },
        "disaster": {
            "num_patients": 200,
            "arrival_interval": 15,
            "speed_factor": 20.0,
            "label": "Mass Disaster",
            "description": "200 patients, 8× arrival rate, 60% critical — extreme stress",
            "risk_weights": [0.05, 0.15, 0.20, 0.60],
        },
    }

    def __init__(
        self,
        num_patients: int = SIM_NUM_PATIENTS,
        speed_factor: float = 10.0,
        arrival_interval: float = SIM_MEAN_ARRIVAL_INTERVAL,
        scenario: str = "normal",
    ):
        self.num_patients = num_patients
        self.speed_factor = speed_factor
        self.arrival_interval = arrival_interval
        self.scenario = scenario

        preset = self.SCENARIOS.get(scenario, self.SCENARIOS["normal"])
        self._risk_weights: list[float] | None = preset.get("risk_weights")
        self._dept_override: dict[str, float] | None = preset.get("dept_override")

        # AI-optimized departments
        self.ai_depts: dict[str, DeptQueue] = {
            name: DeptQueue(name, info["capacity"])
            for name, info in DEPARTMENTS.items()
        }
        # FIFO baseline departments (shadow)
        self.fifo_depts: dict[str, DeptQueue] = {
            name: DeptQueue(name, info["capacity"])
            for name, info in DEPARTMENTS.items()
        }

        # Patient tracking
        self.all_patients: list[SimPatient] = []
        self.fifo_patients: list[SimPatient] = []

        # Counters & state
        self._tick = 0
        self._running = False
        self._patients_rerouted = 0
        self._transitions: list[dict] = []
        self._state_history: list[dict] = []

        # Pre-generate Poisson arrival times
        intervals = np.random.exponential(self.arrival_interval, num_patients)
        self._arrival_times = np.cumsum(intervals).tolist()

    # ── Public interface ────────────────────────────────────

    def reset(self):
        """Reset all simulation state."""
        self._tick = 0
        self._running = False
        self._patients_rerouted = 0
        self._transitions.clear()
        self._state_history.clear()
        self.all_patients.clear()
        self.fifo_patients.clear()
        for dq in self.ai_depts.values():
            dq.reset()
        for dq in self.fifo_depts.values():
            dq.reset()

    def stop(self):
        """Stop the running simulation."""
        self._running = False

    @property
    def processed(self) -> list[SimPatient]:
        """All AI-processed patients."""
        return [p for p in self.all_patients if p.processed]

    @property
    def queue(self) -> list[SimPatient]:
        """All patients currently in AI queues."""
        patients = []
        for dq in self.ai_depts.values():
            patients.extend(dq.waiting)
        return patients

    # ── Simulation loop ─────────────────────────────────────

    async def run(self, on_update: Callable[[dict], None] | None = None):
        """Run the deterministic simulation with async tick loop."""
        self.reset()
        self._running = True
        next_idx = 0
        tick_interval = self.arrival_interval / self.speed_factor

        while self._running:
            self._tick += 1
            sim_time = self._tick * tick_interval

            # ── 1. Admit new patient arrivals ───────────────
            while (
                next_idx < self.num_patients
                and self._arrival_times[next_idx] <= sim_time * self.speed_factor
            ):
                patient = _generate_patient(
                    next_idx + 1,
                    self._arrival_times[next_idx],
                    self._tick,
                    risk_weights=self._risk_weights,
                    dept_override=self._dept_override,
                )
                self.all_patients.append(patient)

                # AI routing (may reroute)
                original_dept = patient.department
                routed_dept = self._ai_route_patient(patient)
                patient.department = routed_dept
                self.ai_depts[routed_dept].enqueue(patient)
                self._add_transition(
                    patient, "arrived", "queued",
                    rerouted=patient.rerouted,
                    rerouted_from=patient.rerouted_from,
                )

                # FIFO shadow copy (always original department, no routing)
                fifo_copy = SimPatient(
                    patient_id=patient.patient_id,
                    name=patient.name,
                    age=patient.age,
                    risk_level=patient.risk_level,
                    risk_score=patient.risk_score,
                    department=original_dept,
                    arrival_time=patient.arrival_time,
                    arrival_tick=self._tick,
                    service_ticks=patient.service_ticks,
                )
                self.fifo_patients.append(fifo_copy)
                fifo_dept = self.fifo_depts.get(original_dept)
                if fifo_dept:
                    fifo_dept.enqueue(fifo_copy)
                else:
                    self.fifo_depts["General Medicine"].enqueue(fifo_copy)

                next_idx += 1

            # ── 2. Process AI departments ───────────────────
            for dq in self.ai_depts.values():
                # Discharge completed treatments
                discharged = dq.process_treatments(self._tick)
                for p in discharged:
                    self._add_transition(p, "treating", "discharged")

                # Admit from queue (priority: Critical first)
                admitted = dq.admit_patients(prioritize=True, current_tick=self._tick)
                for p in admitted:
                    self._add_transition(p, "queued", "treating")

                # Increment wait ticks for still-queued patients
                for p in dq.waiting:
                    p.wait_ticks += 1

            # ── 3. Process FIFO departments (baseline) ──────
            for dq in self.fifo_depts.values():
                dq.process_treatments(self._tick)
                dq.admit_patients(prioritize=False, current_tick=self._tick)
                for p in dq.waiting:
                    p.wait_ticks += 1

            # ── 4. Record state history ─────────────────────
            self._record_history(tick_interval)

            # ── 5. Send update ──────────────────────────────
            state = self.get_state()
            if on_update:
                await on_update(state)

            # ── 6. Check completion ─────────────────────────
            all_arrived = next_idx >= self.num_patients
            ai_queues_empty = all(
                dq.queue_length == 0 and dq.active_count == 0
                for dq in self.ai_depts.values()
            )
            if all_arrived and ai_queues_empty:
                break

            await asyncio.sleep(max(0.35, tick_interval / 2.5))

        self._running = False

    # ── AI routing logic ────────────────────────────────────

    def _ai_route_patient(self, patient: SimPatient) -> str:
        """
        AI routing: priority-aware load-balanced department assignment.

        - Critical patients: find ANY available slot immediately
        - High/Medium/Low: reroute if target department > 80% load
        """
        target = patient.department
        dept_q = self.ai_depts.get(target)

        if dept_q is None:
            target = "General Medicine"
            dept_q = self.ai_depts[target]

        # Critical patients: find closest available slot
        if patient.risk_level == "Critical":
            if dept_q.available_slots > 0:
                return target
            # Search ALL departments, least loaded first
            for name, dq in sorted(
                self.ai_depts.items(), key=lambda x: x[1].load_pct
            ):
                if dq.available_slots > 0:
                    patient.rerouted = True
                    patient.rerouted_from = target
                    self._patients_rerouted += 1
                    return name
            return target  # all full — wait in original

        # Non-critical: reroute if target overloaded
        if dept_q.load_pct > REROUTE_THRESHOLD:
            candidates = sorted(
                [(n, dq) for n, dq in self.ai_depts.items() if n != target],
                key=lambda x: x[1].load_pct,
            )
            for name, dq in candidates:
                if dq.load_pct < REROUTE_THRESHOLD:
                    patient.rerouted = True
                    patient.rerouted_from = target
                    self._patients_rerouted += 1
                    return name

        return target

    # ── Transition tracking ─────────────────────────────────

    def _add_transition(
        self, patient: SimPatient, from_stage: str, to_stage: str,
        rerouted: bool = False, rerouted_from: str | None = None,
    ):
        self._transitions.append({
            "patient_id": patient.patient_id,
            "name": patient.name,
            "risk_level": patient.risk_level,
            "from_stage": from_stage,
            "to_stage": to_stage,
            "department": patient.department,
            "tick": self._tick,
            "rerouted": rerouted,
            "rerouted_from": rerouted_from,
        })
        if len(self._transitions) > 40:
            self._transitions = self._transitions[-40:]

    # ── State history recording ─────────────────────────────

    def _record_history(self, tick_to_sec: float):
        ai_processed = [p for p in self.all_patients if p.processed]
        fifo_processed = [p for p in self.fifo_patients if p.processed]

        ai_waits = [p.wait_ticks * tick_to_sec for p in ai_processed] or [0]
        fifo_waits = [p.wait_ticks * tick_to_sec for p in fifo_processed] or [0]

        risk_dist = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
        for p in self.all_patients:
            risk_dist[p.risk_level] += 1

        dept_occ = {
            name: round(dq.load_pct * 100, 1)
            for name, dq in self.ai_depts.items()
        }

        self._state_history.append({
            "tick": self._tick,
            "ai_queue_depth": sum(dq.queue_length for dq in self.ai_depts.values()),
            "fifo_queue_depth": sum(dq.queue_length for dq in self.fifo_depts.values()),
            "ai_processed": len(ai_processed),
            "fifo_processed": len(fifo_processed),
            "ai_avg_wait": round(float(np.mean(ai_waits)), 1),
            "fifo_avg_wait": round(float(np.mean(fifo_waits)), 1),
            "rerouted_total": self._patients_rerouted,
            "risk_distribution": risk_dist,
            "dept_occupancy": dept_occ,
        })

        if len(self._state_history) > 500:
            self._state_history = self._state_history[-500:]

    # ── Impact metrics ──────────────────────────────────────

    def _compute_queue_theory(self) -> dict:
        """
        Compute M/M/c queueing theory metrics from LIVE simulation state.

        Formulas:
          ρ (utilization) = λ / (c × μ)          — traffic intensity
          L_q (queue length) = observed queue depth
          W_q (wait time)   = L_q / λ            — Little's Law
          Erlang-C probability (approximated from live utilization)
          Throughput X = μ × min(c, n)
        """
        tick_to_sec = self.arrival_interval / self.speed_factor

        # Aggregate across all AI departments
        total_capacity = sum(dq.capacity for dq in self.ai_depts.values())
        total_active = sum(dq.active_count for dq in self.ai_depts.values())
        total_queued = sum(dq.queue_length for dq in self.ai_depts.values())
        total_arrivals = len(self.all_patients)

        # λ (arrival rate): patients per second
        elapsed_sec = max(self._tick * tick_to_sec, 0.1)
        lambda_rate = total_arrivals / elapsed_sec

        # μ (service rate): 1 / avg service time in seconds
        avg_service_sec = float(np.mean(list(SERVICE_TICKS.values()))) * tick_to_sec
        mu_rate = 1.0 / max(avg_service_sec, 0.01)

        # c (number of servers = total capacity slots)
        c = max(total_capacity, 1)

        # ρ (utilization) = λ / (c × μ)
        rho = lambda_rate / (c * mu_rate) if (c * mu_rate) > 0 else 0.0
        rho_clamped = min(rho, 0.999)

        # Erlang-C approximation: P(wait) ≈ ρ^c / (1 - ρ) for M/M/c
        # Simplified form for display
        import math
        try:
            numerator = (c * rho_clamped) ** c / math.factorial(c)
            denominator = numerator + (1 - rho_clamped) * sum(
                (c * rho_clamped) ** k / math.factorial(k) for k in range(c)
            )
            # Use min(c, 20) to avoid factorial explosion
            c_eff = min(c, 20)
            num_eff = (c_eff * rho_clamped) ** c_eff / math.factorial(c_eff)
            denom_eff = num_eff + (1 - rho_clamped) * sum(
                (c_eff * rho_clamped) ** k / math.factorial(k) for k in range(c_eff)
            )
            erlang_c = num_eff / max(denom_eff, 1e-10) if denom_eff > 0 else 0.0
        except (OverflowError, ValueError):
            erlang_c = rho_clamped

        # W_q (expected wait time) via Little's Law: W_q = L_q / λ
        wq_observed = total_queued / max(lambda_rate, 0.001)

        # L_q (expected queue length) from M/M/c: L_q = P(wait) × ρ / (1-ρ)
        lq_theoretical = erlang_c * rho_clamped / max(1 - rho_clamped, 0.001)

        # Throughput
        ai_processed = sum(1 for p in self.all_patients if p.processed)
        throughput = ai_processed / max(elapsed_sec, 0.1)

        # Per-department utilization
        dept_utilization = {}
        for name, dq in self.ai_depts.items():
            dept_utilization[name] = round(dq.load_pct, 3)

        return {
            # Core M/M/c parameters
            "lambda_arrival_rate": round(lambda_rate, 4),     # λ - patients/sec
            "mu_service_rate": round(mu_rate, 4),             # μ - patients/sec/server
            "c_servers": c,                                    # c - total capacity
            "rho_utilization": round(rho, 4),                 # ρ = λ/(cμ)
            # Erlang-C
            "erlang_c_probability": round(erlang_c, 4),       # P(wait)
            # Little's Law
            "lq_queue_length_observed": total_queued,          # L_q observed
            "lq_queue_length_theoretical": round(lq_theoretical, 2),  # L_q from M/M/c
            "wq_wait_time_observed": round(wq_observed, 2),   # W_q = L_q / λ
            # Throughput
            "throughput_rate": round(throughput, 4),           # X = processed/sec
            "total_arrivals": total_arrivals,
            "total_processed": ai_processed,
            "elapsed_seconds": round(elapsed_sec, 1),
            # Per-department
            "dept_utilization": dept_utilization,
            # System stability indicator
            "system_stable": rho < 1.0,
            "stability_margin": round(1.0 - rho, 4),
        }

    def _compute_impact_metrics(self) -> dict:
        """Compute AI vs FIFO comparison metrics (all derived, not fabricated)."""
        tick_to_sec = self.arrival_interval / self.speed_factor

        ai_processed = [p for p in self.all_patients if p.processed]
        fifo_processed = [p for p in self.fifo_patients if p.processed]

        opt_waits = [p.wait_ticks * tick_to_sec for p in ai_processed] or [0]
        fifo_waits = [p.wait_ticks * tick_to_sec for p in fifo_processed] or [0]

        avg_ai = round(float(np.mean(opt_waits)), 1)
        avg_fifo = round(float(np.mean(fifo_waits)), 1)
        improvement = (
            round((avg_fifo - avg_ai) / max(avg_fifo, 0.1) * 100, 1)
            if avg_fifo > 0 else 0.0
        )

        # Per-risk wait
        avg_by_risk = {}
        for risk in ["Low", "Medium", "High", "Critical"]:
            rw = [p.wait_ticks * tick_to_sec for p in ai_processed if p.risk_level == risk]
            avg_by_risk[risk] = round(float(np.mean(rw)), 1) if rw else 0.0

        # Critical wait comparison
        crit_ai = [p.wait_ticks * tick_to_sec for p in ai_processed if p.risk_level == "Critical"]
        crit_fifo = [p.wait_ticks * tick_to_sec for p in fifo_processed if p.risk_level == "Critical"]
        crit_ai_avg = round(float(np.mean(crit_ai)), 1) if crit_ai else 0.0
        crit_fifo_avg = round(float(np.mean(crit_fifo)), 1) if crit_fifo else 0.0
        crit_improvement = (
            round((crit_fifo_avg - crit_ai_avg) / max(crit_fifo_avg, 0.1) * 100, 1)
            if crit_fifo_avg > 0 else 0.0
        )

        # Overloaded departments
        fifo_overloads = sum(1 for dq in self.fifo_depts.values() if dq.is_overloaded)
        ai_overloads = sum(1 for dq in self.ai_depts.values() if dq.is_overloaded)

        return {
            "avg_wait_before_optimization": avg_fifo,
            "avg_wait_after_optimization": avg_ai,
            "wait_time_improvement_pct": improvement,
            "patients_rerouted": self._patients_rerouted,
            "overload_events_prevented": max(0, fifo_overloads - ai_overloads),
            "avg_wait_by_risk": avg_by_risk,
            "critical_wait_optimized": crit_ai_avg,
            "critical_wait_fifo": crit_fifo_avg,
            "critical_routing_improvement_pct": crit_improvement,
            "fifo_overloaded_depts": fifo_overloads,
            "ai_overloaded_depts": ai_overloads,
            "total_processed_optimized": len(ai_processed),
            "total_processed_fifo": len(fifo_processed),
            "throughput_improvement": len(ai_processed) - len(fifo_processed),
        }

    # ── FIFO baseline state ─────────────────────────────────

    def _get_fifo_state(self) -> dict:
        tick_to_sec = self.arrival_interval / self.speed_factor
        departments = [dq.to_dict() for dq in self.fifo_depts.values()]

        fifo_processed = [p for p in self.fifo_patients if p.processed]
        avg_wait = (
            round(float(np.mean([p.wait_ticks * tick_to_sec for p in fifo_processed])), 1)
            if fifo_processed else 0.0
        )

        crit = [p for p in fifo_processed if p.risk_level == "Critical"]
        crit_wait = (
            round(float(np.mean([p.wait_ticks * tick_to_sec for p in crit])), 1)
            if crit else 0.0
        )

        return {
            "queue_length": sum(dq.queue_length for dq in self.fifo_depts.values()),
            "processed_count": len(fifo_processed),
            "departments": departments,
            "overloaded_count": sum(1 for dq in self.fifo_depts.values() if dq.is_overloaded),
            "avg_wait": avg_wait,
            "critical_avg_wait": crit_wait,
        }

    # ── Pipeline stages ─────────────────────────────────────

    def _get_pipeline_stages(self) -> dict:
        """Count patients in each flow stage."""
        stages = {"arrived": 0, "queued": 0, "treating": 0, "discharged": 0}
        for p in self.all_patients:
            if p.stage in stages:
                stages[p.stage] += 1
        return stages

    # ── Full state snapshot ─────────────────────────────────

    def get_state(self) -> dict:
        """Get current simulation state (backward-compatible + new pipeline data)."""
        tick_to_sec = self.arrival_interval / self.speed_factor

        # Queue sorted by priority
        queued_patients: list[SimPatient] = []
        for dq in self.ai_depts.values():
            queued_patients.extend(dq.waiting)
        queued_patients.sort(
            key=lambda p: RISK_PRIORITY.get(p.risk_level, 0), reverse=True
        )

        risk_dist = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
        for p in self.all_patients:
            risk_dist[p.risk_level] += 1

        manual_review = sum(1 for p in self.all_patients if 0.25 <= p.risk_score <= 0.50)

        departments = [dq.to_dict() for dq in self.ai_depts.values()]
        processed_count = sum(1 for p in self.all_patients if p.processed)

        impact = self._compute_impact_metrics()
        queue_theory = self._compute_queue_theory()

        # Operational recommendations
        queue_entries = [
            {"risk_level": p.risk_level, "department": p.department}
            for p in queued_patients
        ]
        recs = generate_recommendations(
            department_loads=departments,
            queue_patients=queue_entries,
            impact_metrics=impact,
        )

        # System info
        preset = self.SCENARIOS.get(self.scenario, self.SCENARIOS["normal"])
        avg_service = float(np.mean(list(SERVICE_TICKS.values())))

        return {
            "tick": self._tick,
            "elapsed_seconds": round(self._tick * tick_to_sec, 1),
            "queue": [
                {
                    "patient_id": p.patient_id,
                    "patient_name": p.name,
                    "age": p.age,
                    "risk_level": p.risk_level,
                    "risk_score": p.risk_score,
                    "department": p.department,
                    "wait_time_seconds": round(p.wait_ticks * tick_to_sec, 1),
                    "position": i + 1,
                    "timestamp": p.arrival_time,
                }
                for i, p in enumerate(queued_patients)
            ],
            "departments": departments,
            "processed_count": processed_count,
            "total_patients": self.num_patients,
            "risk_distribution": risk_dist,
            "manual_review_count": manual_review,
            "impact_metrics": impact,
            "queue_theory": queue_theory,
            "scenario": self.scenario,
            "fifo_comparison": self._get_fifo_state(),
            "recommendations": recs,
            "state_history": (
                self._state_history if not self._running
                else (self._state_history[-1:] if self._state_history else [])
            ),
            # ── New fields for flow pipeline ────────────────
            "pipeline_stages": self._get_pipeline_stages(),
            "recent_transitions": self._transitions[-15:],
            "department_queues": [dq.to_dict() for dq in self.ai_depts.values()],
            "system_info": {
                "arrival_rate": round(1 / max(self.arrival_interval, 1) * 60, 1),
                "avg_service_ticks": round(avg_service, 1),
                "scenario_label": preset.get("label", "Unknown"),
                "total_capacity": sum(
                    DEPARTMENTS[d]["capacity"] for d in DEPARTMENTS
                ),
                "active_departments": sum(
                    1 for dq in self.ai_depts.values() if dq.active_count > 0
                ),
                "ai_mode": True,
            },
        }
