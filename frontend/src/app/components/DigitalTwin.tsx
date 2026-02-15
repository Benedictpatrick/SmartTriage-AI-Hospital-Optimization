"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  SimulationState, DepartmentStatus,
  createSimulationWebSocket, QueueTheoryMetrics,
} from "../lib/api";
import {
  Play, Square, Building2, Shield, TrendingDown,
  AlertTriangle, BarChart3, Zap, Gauge, FlaskConical,
} from "lucide-react";
import { motion } from "framer-motion";
import OperationalRecommendations from "./OperationalRecommendations";
import RiskHistogram from "./RiskHistogram";
import PlaybackTimeline from "./PlaybackTimeline";
import HospitalWorkflowEngine from "./HospitalWorkflowEngine";

/* ── Scenario Labels ─────────────────────────────────────── */
const SCENARIO_LABELS: Record<string, string> = {
  normal: "Normal Operations",
  surge: "Mass Casualty Surge",
  flu_outbreak: "Flu Outbreak",
  cardiac_surge: "Cardiac Event Cluster",
  digital_twin: "Hospital Digital Twin",
  disaster: "Mass Disaster (Extreme)",
};

/* ── Animated Counter ────────────────────────────────────── */
function AnimCounter({ value, suffix = "", decimals = 0 }: {
  value: number; suffix?: string; decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const dur = 800, start = performance.now(), from = prevRef.current;
    const step = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * e);
      if (p < 1) requestAnimationFrame(step);
      else prevRef.current = value;
    };
    requestAnimationFrame(step);
  }, [value]);
  return <span className="tabular-nums">{display.toFixed(decimals)}{suffix}</span>;
}

/* ── Queue Theory Panel ──────────────────────────────────── */

function QueueTheoryPanel({ data }: { data: QueueTheoryMetrics }) {
  const rhoColor =
    data.rho_utilization >= 0.95 ? "text-red-600" :
    data.rho_utilization >= 0.80 ? "text-amber-600" : "text-emerald-600";
  const rhoBg =
    data.rho_utilization >= 0.95 ? "bg-red-50 border-red-200" :
    data.rho_utilization >= 0.80 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200";

  return (
    <div className="section">
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical className="w-3.5 h-3.5 text-violet-600" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          M/M/c Queue Theory — Live Metrics
        </span>
        <div className={`ml-auto px-2 py-0.5 rounded text-[8px] font-bold border ${rhoBg} ${rhoColor}`}>
          {data.system_stable ? "STABLE" : "UNSTABLE"} · ρ = {(data.rho_utilization * 100).toFixed(1)}%
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-2">
        <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200">
          <div className="text-[8px] text-gray-400 uppercase font-medium">λ (Arrival Rate)</div>
          <div className="text-sm font-bold text-gray-900 tabular-nums">{(data.lambda_arrival_rate * 60).toFixed(1)}/min</div>
          <div className="text-[7px] text-gray-400">{data.lambda_arrival_rate.toFixed(4)}/s</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200">
          <div className="text-[8px] text-gray-400 uppercase font-medium">μ (Service Rate)</div>
          <div className="text-sm font-bold text-gray-900 tabular-nums">{(data.mu_service_rate * 60).toFixed(1)}/min</div>
          <div className="text-[7px] text-gray-400">per server</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200">
          <div className="text-[8px] text-gray-400 uppercase font-medium">c (Servers)</div>
          <div className="text-sm font-bold text-gray-900 tabular-nums">{data.c_servers}</div>
          <div className="text-[7px] text-gray-400">capacity slots</div>
        </div>
        <div className={`rounded-lg p-2 text-center border ${rhoBg}`}>
          <div className="text-[8px] text-gray-400 uppercase font-medium">ρ (Utilization)</div>
          <div className={`text-sm font-bold tabular-nums ${rhoColor}`}>{(data.rho_utilization * 100).toFixed(1)}%</div>
          <div className="text-[7px] text-gray-400">λ/(cμ)</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-violet-50 rounded-lg p-2 text-center border border-violet-200">
          <div className="text-[8px] text-violet-500 uppercase font-medium">Erlang-C P(wait)</div>
          <div className="text-sm font-bold text-violet-700 tabular-nums">{(data.erlang_c_probability * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-200">
          <div className="text-[8px] text-blue-500 uppercase font-medium">L_q (Queue Len)</div>
          <div className="text-sm font-bold text-blue-700 tabular-nums">{data.lq_queue_length_observed}</div>
          <div className="text-[7px] text-gray-400">theory: {data.lq_queue_length_theoretical}</div>
        </div>
        <div className="bg-cyan-50 rounded-lg p-2 text-center border border-cyan-200">
          <div className="text-[8px] text-cyan-500 uppercase font-medium">W_q (Wait Time)</div>
          <div className="text-sm font-bold text-cyan-700 tabular-nums">{data.wq_wait_time_observed.toFixed(1)}s</div>
          <div className="text-[7px] text-gray-400">L_q / λ (Little&apos;s Law)</div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[8px] text-gray-400">
        <span>Throughput: <span className="font-mono text-gray-600">{(data.throughput_rate * 60).toFixed(1)}/min</span></span>
        <span className="w-1 h-1 rounded-full bg-gray-300" />
        <span>Processed: <span className="font-mono text-gray-600">{data.total_processed}/{data.total_arrivals}</span></span>
        <span className="w-1 h-1 rounded-full bg-gray-300" />
        <span>Margin: <span className="font-mono text-gray-600">{(data.stability_margin * 100).toFixed(1)}%</span></span>
      </div>
    </div>
  );
}

/* ── Mini Department Grid ────────────────────────────────── */
function MiniDeptGrid({ departments, label, variant }: {
  departments: DepartmentStatus[]; label: string; variant: "ai" | "fifo";
}) {
  const overloaded = departments.filter(d => d.is_overloaded).length;
  const labelColor = variant === "ai" ? "text-cyan-600" : "text-red-600";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${labelColor}`}>{label}</span>
        {overloaded > 0 && (
          <span className="text-[9px] text-red-600 font-mono">{overloaded} overloaded</span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {departments.slice(0, 8).map(dept => {
          const pct = dept.occupancy_pct;
          const bg = pct >= 85 ? "bg-red-50" : pct >= 60 ? "bg-yellow-50" : "bg-green-50";
          const tc = pct >= 85 ? "text-red-600" : pct >= 60 ? "text-yellow-600" : "text-green-600";
          return (
            <div key={dept.name} className={`${bg} rounded px-1.5 py-1 ${pct >= 85 ? "ring-1 ring-red-300" : ""}`}>
              <div className="text-[8px] text-gray-400 truncate">{dept.name.slice(0, 6)}</div>
              <div className={`text-[11px] font-bold ${tc} tabular-nums`}>{Math.round(pct)}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main DigitalTwin Component ──────────────────────────── */
export default function DigitalTwin() {
  const [state, setState] = useState<SimulationState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [scenario, setScenario] = useState("digital_twin");
  const [surgeMode, setSurgeMode] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const startSim = useCallback(() => {
    setIsRunning(true);
    setIsComplete(false);
    setState(null);
    const activeScenario = surgeMode ? "surge" : scenario;
    const ws = createSimulationWebSocket(
      (s) => {
        setState(s);
        if (s.simulation_complete) { setIsComplete(true); setIsRunning(false); }
      },
      () => setIsRunning(false),
      () => setIsRunning(false),
      activeScenario,
    );
    wsRef.current = ws;
  }, [scenario, surgeMode]);

  const stopSim = useCallback(() => { wsRef.current?.close(); setIsRunning(false); }, []);
  useEffect(() => () => { wsRef.current?.close(); }, []);

  const metrics = state?.impact_metrics;
  const fifo = state?.fifo_comparison;

  const waitReduction = metrics?.wait_time_improvement_pct ?? 0;
  const criticalImprovement = metrics?.critical_routing_improvement_pct ?? 0;
  const overloadReduction =
    fifo && fifo.overloaded_count > 0
      ? Math.round(((fifo.overloaded_count - (metrics?.ai_overloaded_depts ?? 0)) / fifo.overloaded_count) * 100)
      : 0;

  return (
    <div className="space-y-3">
      {/* ── Header + Controls ──────────────────────── */}
      <div className="section">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-200">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Hospital Digital Twin</h2>
              <p className="text-[10px] text-gray-400">AI-Optimized vs Traditional FIFO — Side-by-Side</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Surge Mode Toggle */}
            <button
              onClick={() => !isRunning && setSurgeMode(!surgeMode)}
              disabled={isRunning}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                surgeMode
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
              }`}
            >
              <Gauge className="w-3 h-3" />
              {surgeMode ? "Surge ON" : "Normal"}
            </button>

            <select
              value={scenario}
              onChange={(e) => !isRunning && setScenario(e.target.value)}
              disabled={isRunning}
              className="bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-900 px-2 py-1.5 focus:outline-none focus:border-blue-400 disabled:opacity-50"
            >
              {Object.entries(SCENARIO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            {isRunning ? (
              <button onClick={stopSim} className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-bold uppercase tracking-wider transition">
                <Square className="w-3 h-3" /> Stop
              </button>
            ) : (
              <button onClick={startSim} className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold uppercase tracking-wider transition">
                <Play className="w-3 h-3" /> {isComplete ? "Restart" : "Run Twin"}
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        {state && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
              <span>Processed: <span className="text-gray-900 font-mono">{state.processed_count}</span> / {state.total_patients}</span>
              <span>Tick: <span className="text-gray-900 font-mono">{state.tick}</span> · Elapsed: <span className="text-gray-900 font-mono">{state.elapsed_seconds}s</span></span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(state.processed_count / state.total_patients) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Hospital Workflow Engine ──────────────── */}
      {state && state.pipeline_stages && state.system_info && (
        <HospitalWorkflowEngine
          pipelineStages={state.pipeline_stages}
          recentTransitions={state.recent_transitions || []}
          departmentQueues={state.department_queues || state.departments || []}
          systemInfo={state.system_info}
          tick={state.tick}
          elapsedSeconds={state.elapsed_seconds}
          isRunning={isRunning}
          fifoComparison={state.fifo_comparison || null}
          aiAvgWait={metrics?.avg_wait_after_optimization}
          aiCriticalWait={metrics?.critical_wait_optimized}
        />
      )}

      {/* ── Queue Theory Panel ─────────────────────── */}
      {state?.queue_theory && (
        <QueueTheoryPanel data={state.queue_theory} />
      )}

      {/* ── Headline Impact Numbers ────────────────── */}
      {state && metrics && (
        <>
          {surgeMode && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg"
            >
              <Gauge className="w-4 h-4 text-red-600" />
              <div className="flex-1">
                <span className="text-[10px] font-bold text-red-700">Surge Mode Active</span>
                <span className="text-[9px] text-red-500 ml-2">
                  4x arrival rate — {state.queue_theory?.system_stable ? "AI maintaining stability" : "System under stress — AI preventing collapse"}
                </span>
              </div>
              <div className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                state.queue_theory?.system_stable
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-red-100 text-red-700 border border-red-300 animate-pulse"
              }`}>
                {state.queue_theory?.system_stable ? "STABILIZED" : "UNDER LOAD"}
              </div>
            </motion.div>
          )}
          <div className="grid grid-cols-3 gap-2">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="section text-center py-3">
            <div className="text-2xl font-black text-blue-600">
              <AnimCounter value={waitReduction} suffix="%" decimals={1} />
            </div>
            <div className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Wait Time Reduction</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <TrendingDown className="w-3 h-3 text-green-600" />
              <span className="text-[9px] text-green-600">{metrics.avg_wait_before_optimization.toFixed(1)}s → {metrics.avg_wait_after_optimization.toFixed(1)}s</span>
            </div>
          </motion.div>

          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="section text-center py-3">
            <div className="text-2xl font-black text-emerald-600">
              <AnimCounter value={criticalImprovement} suffix="%" decimals={1} />
            </div>
            <div className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Faster Critical Routing</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Shield className="w-3 h-3 text-emerald-600" />
              <span className="text-[9px] text-emerald-600">Critical patients prioritized</span>
            </div>
          </motion.div>

          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="section text-center py-3">
            <div className="text-2xl font-black text-amber-600">
              <AnimCounter value={overloadReduction} suffix="%" decimals={0} />
            </div>
            <div className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Overload Reduction</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Zap className="w-3 h-3 text-amber-600" />
              <span className="text-[9px] text-amber-600">{metrics.patients_rerouted} rerouted</span>
            </div>
          </motion.div>
        </div>
        </>
      )}

      {/* ── Side-by-Side Comparison ────────────────── */}
      {state && fifo && metrics && (
        <div className="grid grid-cols-2 gap-3">
          {/* WITHOUT AI */}
          <div className="section" style={{ borderColor: "rgba(239,68,68,0.15)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Without AI — FIFO Queue</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <div className="bg-red-50 rounded px-2 py-1.5 text-center">
                <div className="text-[8px] text-gray-400 uppercase">Queue</div>
                <div className="text-sm font-bold text-red-600 tabular-nums">{fifo.queue_length}</div>
              </div>
              <div className="bg-red-50 rounded px-2 py-1.5 text-center">
                <div className="text-[8px] text-gray-400 uppercase">Avg Wait</div>
                <div className="text-sm font-bold text-red-600 tabular-nums">{fifo.avg_wait.toFixed(1)}s</div>
              </div>
              <div className="bg-red-50 rounded px-2 py-1.5 text-center">
                <div className="text-[8px] text-gray-400 uppercase">Overloaded</div>
                <div className="text-sm font-bold text-red-600 tabular-nums">{fifo.overloaded_count}</div>
              </div>
            </div>
            <div className="bg-red-50 rounded px-2 py-1.5 mb-3 flex items-center justify-between">
              <span className="text-[10px] text-red-600">Critical Avg Wait</span>
              <span className="text-sm font-bold text-red-600 tabular-nums">{fifo.critical_avg_wait.toFixed(1)}s</span>
            </div>
            <MiniDeptGrid departments={fifo.departments} label="Department Load" variant="fifo" />
            {fifo.overloaded_count > 0 && (
              <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded border border-red-200">
                <AlertTriangle className="w-3 h-3 text-red-600" />
                <span className="text-[10px] text-red-600">{fifo.overloaded_count} departments at capacity — patients waiting</span>
              </div>
            )}
          </div>

          {/* WITH AI */}
          <div className="section" style={{ borderColor: "rgba(6,182,212,0.15)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-[11px] font-bold text-cyan-600 uppercase tracking-wider">With AI — Priority + Load Balanced</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <div className="bg-cyan-50 rounded px-2 py-1.5 text-center">
                <div className="text-[8px] text-gray-400 uppercase">Queue</div>
                <div className="text-sm font-bold text-cyan-600 tabular-nums">{state.queue.length}</div>
              </div>
              <div className="bg-cyan-50 rounded px-2 py-1.5 text-center">
                <div className="text-[8px] text-gray-400 uppercase">Avg Wait</div>
                <div className="text-sm font-bold text-cyan-600 tabular-nums">{metrics.avg_wait_after_optimization.toFixed(1)}s</div>
              </div>
              <div className="bg-cyan-50 rounded px-2 py-1.5 text-center">
                <div className="text-[8px] text-gray-400 uppercase">Overloaded</div>
                <div className="text-sm font-bold text-cyan-600 tabular-nums">{metrics.ai_overloaded_depts ?? 0}</div>
              </div>
            </div>
            <div className="bg-cyan-50 rounded px-2 py-1.5 mb-3 flex items-center justify-between">
              <span className="text-[10px] text-cyan-600">Critical Avg Wait</span>
              <span className="text-sm font-bold text-cyan-600 tabular-nums">{metrics.critical_wait_optimized.toFixed(1)}s</span>
            </div>
            <MiniDeptGrid departments={state.departments} label="Department Load" variant="ai" />
            {metrics.patients_rerouted > 0 && (
              <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-cyan-50 rounded border border-cyan-200">
                <Shield className="w-3 h-3 text-cyan-600" />
                <span className="text-[10px] text-cyan-600">{metrics.patients_rerouted} patients rerouted to prevent overload</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Performance Comparison Bars ─────────────── */}
      {state && metrics && (
        <div className="section">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Performance Comparison</span>
          </div>
          <div className="space-y-3">
            {/* Wait Time */}
            <div>
              <div className="text-[10px] text-gray-400 mb-1">Average Wait Time</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-red-600 w-10">FIFO</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-red-500/70 rounded-full" initial={{ width: 0 }}
                      animate={{ width: `${Math.min((metrics.avg_wait_before_optimization / Math.max(metrics.avg_wait_before_optimization, metrics.avg_wait_after_optimization, 1)) * 100, 100)}%` }}
                      transition={{ duration: 0.5 }} />
                  </div>
                  <span className="text-[10px] text-red-600 font-mono w-12 text-right">{metrics.avg_wait_before_optimization.toFixed(1)}s</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-blue-600 w-10">AI</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-cyan-500/70 rounded-full" initial={{ width: 0 }}
                      animate={{ width: `${Math.min((metrics.avg_wait_after_optimization / Math.max(metrics.avg_wait_before_optimization, metrics.avg_wait_after_optimization, 1)) * 100, 100)}%` }}
                      transition={{ duration: 0.5, delay: 0.1 }} />
                  </div>
                  <span className="text-[10px] text-blue-600 font-mono w-12 text-right">{metrics.avg_wait_after_optimization.toFixed(1)}s</span>
                </div>
              </div>
            </div>
            {/* Critical Wait */}
            <div>
              <div className="text-[10px] text-gray-400 mb-1">Critical Patient Wait</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-red-600 w-10">FIFO</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-red-500/70 rounded-full" initial={{ width: 0 }}
                      animate={{ width: `${Math.min((metrics.critical_wait_fifo / Math.max(metrics.critical_wait_fifo, metrics.critical_wait_optimized, 1)) * 100, 100)}%` }}
                      transition={{ duration: 0.5 }} />
                  </div>
                  <span className="text-[10px] text-red-600 font-mono w-12 text-right">{metrics.critical_wait_fifo.toFixed(1)}s</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-blue-600 w-10">AI</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-cyan-500/70 rounded-full" initial={{ width: 0 }}
                      animate={{ width: `${Math.min((metrics.critical_wait_optimized / Math.max(metrics.critical_wait_fifo, metrics.critical_wait_optimized, 1)) * 100, 100)}%` }}
                      transition={{ duration: 0.5, delay: 0.1 }} />
                  </div>
                  <span className="text-[10px] text-blue-600 font-mono w-12 text-right">{metrics.critical_wait_optimized.toFixed(1)}s</span>
                </div>
              </div>
            </div>
            {/* Bottom KPIs */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-200">
              <div className="text-center">
                <div className="text-base font-bold text-blue-600 tabular-nums">{metrics.patients_rerouted}</div>
                <div className="text-[8px] text-gray-400 uppercase">Rerouted</div>
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-emerald-600 tabular-nums">{metrics.overload_events_prevented}</div>
                <div className="text-[8px] text-gray-400 uppercase">Overloads Prevented</div>
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-gray-900 tabular-nums">{metrics.total_processed_optimized}</div>
                <div className="text-[8px] text-gray-400 uppercase">AI Processed</div>
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-gray-500 tabular-nums">{metrics.total_processed_fifo}</div>
                <div className="text-[8px] text-gray-400 uppercase">FIFO Processed</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Why AI Wins (post-simulation) ──────────── */}
      {isComplete && metrics && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="section" style={{ borderColor: "rgba(6,182,212,0.1)" }}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-3">Why AI-Optimized Triage Wins</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mb-2">Traditional (FIFO)</div>
              <ul className="space-y-1">
                {["Subjective triage decisions", "No department load awareness", "Critical patients wait in line", "Departments become bottlenecked", "No real-time optimization"].map(t => (
                  <li key={t} className="text-[10px] text-gray-500 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-2">MedBrain AI System</div>
              <ul className="space-y-1">
                {["Data-driven risk quantification", "Dynamic load balancing", "Critical patients auto-prioritized", "Smart rerouting prevents overload", "Transparent reasoning (SHAP + Protocols)"].map(t => (
                  <li key={t} className="text-[10px] text-gray-500 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Operational Recommendations (live) ──── */}
      {state && state.recommendations && state.recommendations.length > 0 && (
        <OperationalRecommendations liveRecommendations={state.recommendations} />
      )}

      {/* ── Risk Distribution Histogram ───────── */}
      {state && state.risk_distribution && (
        <RiskHistogram
          distribution={state.risk_distribution}
          manualReviewCount={state.manual_review_count}
        />
      )}

      {/* ── Playback Timeline (post-sim) ───────── */}
      {isComplete && state?.state_history && state.state_history.length > 3 && (
        <PlaybackTimeline history={state.state_history} />
      )}

      {/* ── Empty state ────────────────────────────── */}
      {!state && !isRunning && (
        <div className="section text-center py-12">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-1">Hospital Digital Twin</p>
          <p className="text-[11px] text-gray-400">Select a scenario and click <span className="text-blue-600">Run Twin</span> to see AI vs Traditional triage in real-time</p>
        </div>
      )}
    </div>
  );
}
