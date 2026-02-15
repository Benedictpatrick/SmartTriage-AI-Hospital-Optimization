"""
Real-Time Event Log — Ring-buffer event store for system observability.

Tracks all triage decisions, escalations, reroutes, alerts, and system events.
Used by the frontend EventLog component for live feed display.
"""
from __future__ import annotations

import time
import uuid
from collections import deque
from threading import Lock
from dataclasses import dataclass, field, asdict
from typing import Optional


@dataclass
class EventEntry:
    id: str
    timestamp: float
    event_type: str  # triage, escalation, reroute, alert, system
    severity: str  # info, warning, critical
    message: str
    patient_id: Optional[str] = None
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


class EventLog:
    """Thread-safe singleton event log with ring buffer."""

    _instance: Optional[EventLog] = None

    def __new__(cls) -> EventLog:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, max_events: int = 200):
        if self._initialized:
            return
        self._buffer: deque[EventEntry] = deque(maxlen=max_events)
        self._lock = Lock()
        self._initialized = True

        # Add startup event
        self.add(
            event_type="system",
            severity="info",
            message="MedBrain Command Center initialized",
        )

    def add(
        self,
        event_type: str,
        severity: str,
        message: str,
        patient_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> EventEntry:
        """Add a new event to the log."""
        entry = EventEntry(
            id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
            timestamp=time.time(),
            event_type=event_type,
            severity=severity,
            message=message,
            patient_id=patient_id,
            metadata=metadata or {},
        )
        with self._lock:
            self._buffer.append(entry)
        return entry

    def recent(self, limit: int = 50) -> list[dict]:
        """Get the most recent events (newest first)."""
        with self._lock:
            items = list(self._buffer)
        items.reverse()
        return [e.to_dict() for e in items[:limit]]

    def by_type(self, event_type: str, limit: int = 20) -> list[dict]:
        """Get recent events filtered by type."""
        with self._lock:
            items = [e for e in self._buffer if e.event_type == event_type]
        items.reverse()
        return [e.to_dict() for e in items[:limit]]

    def clear(self):
        """Clear all events."""
        with self._lock:
            self._buffer.clear()

    @property
    def count(self) -> int:
        return len(self._buffer)


# Module-level singleton
event_log = EventLog()
