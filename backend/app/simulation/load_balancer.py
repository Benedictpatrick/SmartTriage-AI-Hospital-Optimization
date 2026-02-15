"""
Department Load Optimizer.

Tracks capacity per department and provides:
- Load-aware routing decisions
- Fallback recommendations
- Load balancing analytics
"""
from __future__ import annotations

import copy
from app.core.config import DEPARTMENTS, DEPARTMENT_FALLBACKS, DEPARTMENT_OVERLOAD_THRESHOLD


class LoadBalancer:
    """Manages and optimizes department loads."""

    def __init__(self):
        self.departments = copy.deepcopy(DEPARTMENTS)
        self._history: list[dict] = []

    def get_load(self, dept: str) -> float:
        """Get occupancy fraction for a department."""
        info = self.departments.get(dept)
        if not info:
            return 0.0
        return info["current_load"] / max(info["capacity"], 1)

    def get_all_loads(self) -> dict[str, float]:
        """Get occupancy fractions for all departments."""
        return {
            dept: info["current_load"] / max(info["capacity"], 1)
            for dept, info in self.departments.items()
        }

    def admit_patient(self, dept: str) -> bool:
        """
        Try to admit a patient to a department.
        Returns True if admitted, False if at capacity.
        """
        info = self.departments.get(dept)
        if not info:
            return False
        if info["current_load"] < info["capacity"]:
            info["current_load"] += 1
            self._record_state()
            return True
        return False

    def discharge_patient(self, dept: str) -> bool:
        """Discharge a patient from a department."""
        info = self.departments.get(dept)
        if not info or info["current_load"] <= 0:
            return False
        info["current_load"] -= 1
        self._record_state()
        return True

    def recommend_department(
        self, primary: str, severity_int: int
    ) -> tuple[str, str | None, str]:
        """
        Smart department recommendation with load balancing.

        Args:
            primary: ML-predicted department
            severity_int: 0=Low, 1=Med, 2=High, 3=Critical

        Returns:
            (final_dept, fallback_or_None, reason)
        """
        load = self.get_load(primary)

        # Critical patients always go to primary (or Emergency)
        if severity_int >= 3:
            if load < 1.0:
                return primary, None, f"Critical case assigned to {primary}"
            else:
                return "Emergency", primary, f"{primary} full, critical case routed to Emergency"

        # Non-critical: check if overloaded
        if load < DEPARTMENT_OVERLOAD_THRESHOLD:
            return primary, None, f"{primary} (occupancy {load:.0%})"

        # Try fallbacks
        fallbacks = DEPARTMENT_FALLBACKS.get(primary, [])
        for fb in fallbacks:
            fb_load = self.get_load(fb)
            if fb_load < DEPARTMENT_OVERLOAD_THRESHOLD:
                reason = (
                    f"{primary} overloaded ({load:.0%}), "
                    f"redirected to {fb} ({fb_load:.0%})"
                )
                return fb, primary, reason

        # All fallbacks full → still assign to primary
        return primary, None, f"{primary} overloaded but no alternatives available"

    def get_status(self) -> list[dict]:
        """Get status of all departments."""
        return [
            {
                "name": dept,
                "capacity": info["capacity"],
                "current_load": info["current_load"],
                "occupancy_pct": round(info["current_load"] / max(info["capacity"], 1) * 100, 1),
                "is_overloaded": self.get_load(dept) >= DEPARTMENT_OVERLOAD_THRESHOLD,
            }
            for dept, info in self.departments.items()
        ]

    def reset(self):
        """Reset all loads to zero."""
        for dept in self.departments:
            self.departments[dept]["current_load"] = 0
        self._history.clear()

    def _record_state(self):
        """Record a snapshot for history tracking."""
        self._history.append(
            {dept: info["current_load"] for dept, info in self.departments.items()}
        )

    def get_history(self) -> list[dict]:
        """Get load history for analytics."""
        return self._history
