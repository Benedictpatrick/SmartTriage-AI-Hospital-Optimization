"""
Events API Routes.

GET /api/events/recent    — Get recent system events
GET /api/events/stream    — SSE stream (future)
"""
from __future__ import annotations

from fastapi import APIRouter, Query
from app.core.event_log import event_log

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("/recent")
async def get_recent_events(
    limit: int = Query(50, ge=1, le=200),
    event_type: str | None = Query(None),
):
    """Get recent events from the system event log."""
    if event_type:
        events = event_log.by_type(event_type, limit=limit)
    else:
        events = event_log.recent(limit=limit)
    return {"events": events, "total": event_log.count}
