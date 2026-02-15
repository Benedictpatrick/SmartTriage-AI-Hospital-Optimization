"""
Queue & Simulation API Routes.

WebSocket /ws/simulation  — Live simulation stream (accepts scenario config)
GET  /api/simulation/state — Current simulation snapshot
POST /api/simulation/start — Start a new simulation
POST /api/simulation/stop  — Stop running simulation
GET  /api/simulation/scenarios — List available stress test scenarios
"""
from __future__ import annotations

import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.api.deps import get_simulator
from app.simulation.queue_sim import QueueSimulator
from app.core.event_log import event_log
from app.core.recommendations import generate_recommendations

router = APIRouter(tags=["simulation"])

# Module-level simulator override for scenario-based runs
_scenario_simulator: QueueSimulator | None = None


@router.get("/api/simulation/scenarios")
async def list_scenarios():
    """List available stress test scenarios with descriptions."""
    return {
        "scenarios": {
            name: {
                "label": cfg["label"],
                "description": cfg["description"],
                "num_patients": cfg["num_patients"],
                "arrival_interval": cfg["arrival_interval"],
                "speed_factor": cfg["speed_factor"],
            }
            for name, cfg in QueueSimulator.SCENARIOS.items()
        }
    }


@router.get("/api/recommendations")
async def get_recommendations():
    """Get operational recommendations based on current department loads."""
    from app.api.deps import get_load_balancer
    lb = get_load_balancer()
    dept_status = lb.get_status()
    recs = generate_recommendations(department_loads=dept_status)
    return {"recommendations": recs}


@router.post("/api/simulation/start")
async def start_simulation():
    """Start the queue simulation (non-blocking, run via WebSocket)."""
    sim = get_simulator()
    sim.reset()
    return {"status": "ready", "total_patients": sim.num_patients, "message": "Connect to /ws/simulation to stream"}


@router.post("/api/simulation/stop")
async def stop_simulation():
    """Stop the running simulation."""
    global _scenario_simulator
    sim = _scenario_simulator or get_simulator()
    sim.stop()
    _scenario_simulator = None
    return {"status": "stopped"}


@router.get("/api/simulation/state")
async def get_simulation_state():
    """Get current simulation state snapshot."""
    global _scenario_simulator
    sim = _scenario_simulator or get_simulator()
    return sim.get_state()


@router.websocket("/ws/simulation")
async def simulation_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time simulation streaming.

    Client can send an initial JSON config message:
      { "scenario": "surge" | "flu_outbreak" | "cardiac_surge" | "normal" }
    If no config received within 1 second, defaults to "normal".
    """
    global _scenario_simulator
    await websocket.accept()

    # ── Wait for optional scenario config ───────────────────
    scenario_name = "normal"
    try:
        # Give client 1.5s to send config
        raw = await asyncio.wait_for(websocket.receive_text(), timeout=1.5)
        config = json.loads(raw)
        scenario_name = config.get("scenario", "normal")
    except (asyncio.TimeoutError, json.JSONDecodeError, Exception):
        pass  # Use default

    # ── Build simulator from scenario ───────────────────────
    preset = QueueSimulator.SCENARIOS.get(scenario_name, QueueSimulator.SCENARIOS["normal"])
    sim = QueueSimulator(
        num_patients=preset["num_patients"],
        speed_factor=preset["speed_factor"],
        arrival_interval=preset["arrival_interval"],
        scenario=scenario_name,
    )
    _scenario_simulator = sim

    event_log.add(
        event_type="system",
        severity="info" if scenario_name == "normal" else "warning",
        message=f"Simulation started: {preset['label']} — {preset['num_patients']} patients",
        metadata={"scenario": scenario_name},
    )

    try:
        async def send_update(state: dict):
            await websocket.send_json(state)

        await sim.run(on_update=send_update)

        # Send final state
        final_state = sim.get_state()
        await websocket.send_json({
            **final_state,
            "simulation_complete": True,
        })

        event_log.add(
            event_type="system",
            severity="info",
            message=f"Simulation complete: {preset['label']} — processed {len(sim.processed)} patients",
            metadata={
                "scenario": scenario_name,
                "processed": len(sim.processed),
                "rerouted": sim._patients_rerouted,
            },
        )

    except WebSocketDisconnect:
        sim.stop()
    except Exception as e:
        try:
            await websocket.send_json({"error": str(e)})
        except Exception:
            pass
        sim.stop()
    finally:
        _scenario_simulator = None
