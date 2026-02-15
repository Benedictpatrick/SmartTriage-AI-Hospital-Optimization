"use client";

import { Fragment, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, Clock, Stethoscope, CheckCircle,
  ArrowDown, Activity, Zap, AlertTriangle,
  Shield, GitBranch, Brain, Heart,
  ChevronRight, Workflow, Users, Timer,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────── */

interface PipelineStages {
  arrived: number;
  queued: number;
  treating: number;
  discharged: number;
  [key: string]: number;
}

interface PatientTransition {
  patient_id: string;
  name: string;
  risk_level: string;
  from_stage: string;
  to_stage: string;
  department: string;
  tick: number;
  rerouted: boolean;
  rerouted_from?: string | null;
}

interface DeptQueueInfo {
  name: string;
  capacity: number;
  current_load: number;
  queue_length?: number;
  occupancy_pct: number;
  is_overloaded: boolean;
  critical_count?: number;
  active_patients?: number;
}

interface SystemInfo {
  arrival_rate: number;
  avg_service_ticks: number;
  scenario_label: string;
  total_capacity: number;
  active_departments: number;
  ai_mode: boolean;
}

interface FifoComparison {
  queue_length: number;
  processed_count: number;
  departments: DeptQueueInfo[];
  overloaded_count: number;
  avg_wait: number;
  critical_avg_wait: number;
}

interface Props {
  pipelineStages: PipelineStages;
  recentTransitions: PatientTransition[];
  departmentQueues: DeptQueueInfo[];
  systemInfo: SystemInfo;
  tick: number;
  elapsedSeconds: number;
  isRunning: boolean;
  fifoComparison?: FifoComparison | null;
  aiAvgWait?: number;
  aiCriticalWait?: number;
}

/* ── Constants ─────────────────────────────────────────── */

const RISK_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
  High:     { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
  Medium:   { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", dot: "bg-yellow-500" },
  Low:      { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500" },
};

const WORKFLOW_STAGES = [
  {
    key: "intake",
    label: "Patient Intake",
    sublabel: "Arrival & Registration",
    Icon: UserPlus,
    color: "blue",
    stageKey: "arrived",
  },
  {
    key: "risk",
    label: "Risk Engine",
    sublabel: "7-Layer AI Classification",
    Icon: Brain,
    color: "violet",
    stageKey: null,
  },
  {
    key: "routing",
    label: "Routing Decision",
    sublabel: "Priority + Load Balance",
    Icon: GitBranch,
    color: "cyan",
    stageKey: null,
  },
  {
    key: "queue",
    label: "Department Queue",
    sublabel: "Queued for Treatment",
    Icon: Clock,
    color: "amber",
    stageKey: "queued",
  },
  {
    key: "treating",
    label: "Treatment Active",
    sublabel: "In-Progress Care",
    Icon: Stethoscope,
    color: "emerald",
    stageKey: "treating",
  },
  {
    key: "discharged",
    label: "Treatment Complete",
    sublabel: "Patient Discharged",
    Icon: CheckCircle,
    color: "green",
    stageKey: "discharged",
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; light: string; dot: string }> = {
  blue:    { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-600",    light: "bg-blue-100",    dot: "bg-blue-500" },
  violet:  { bg: "bg-violet-50",  border: "border-violet-200",  text: "text-violet-600",  light: "bg-violet-100",  dot: "bg-violet-500" },
  cyan:    { bg: "bg-cyan-50",    border: "border-cyan-200",    text: "text-cyan-600",    light: "bg-cyan-100",    dot: "bg-cyan-500" },
  amber:   { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-600",   light: "bg-amber-100",   dot: "bg-amber-500" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-600", light: "bg-emerald-100", dot: "bg-emerald-500" },
  green:   { bg: "bg-green-50",   border: "border-green-200",   text: "text-green-600",   light: "bg-green-100",   dot: "bg-green-500" },
};

const DEPT_SHORT: Record<string, string> = {
  "Emergency": "ER",
  "Cardiology": "CARD",
  "Neurology": "NEURO",
  "General Medicine": "GEN",
  "Pulmonology": "PULM",
  "Infectious Disease": "INFECT",
  "Surgery": "SURG",
  "Gastroenterology": "GASTRO",
};

/* ── Patient Token ─────────────────────────────────────── */

function PatientToken({ risk, rerouted }: { risk: string; rerouted?: boolean }) {
  const c = RISK_COLORS[risk] || RISK_COLORS.Low;
  return (
    <motion.div
      className={`w-5 h-5 rounded-full ${c.dot} flex items-center justify-center text-[7px] font-bold text-white shadow-sm relative`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      title={`${risk} risk patient`}
    >
      {risk.charAt(0)}
      {rerouted && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-white" />
      )}
    </motion.div>
  );
}

/* ── Connector Arrow ───────────────────────────────────── */

function Connector({ active, hasFlow }: { active: boolean; hasFlow: boolean }) {
  return (
    <div className="flex flex-col items-center py-1 relative">
      <div className={`w-px h-6 ${active ? "bg-blue-300" : "bg-gray-200"} relative`}>
        {hasFlow && (
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500"
            animate={{ y: [0, 24] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
          />
        )}
      </div>
      <ChevronRight className={`w-3 h-3 rotate-90 ${active ? "text-blue-400" : "text-gray-300"}`} />
    </div>
  );
}

/* ── Department Capacity Block ─────────────────────────── */

function DeptBlock({ dept, compact }: { dept: DeptQueueInfo; compact?: boolean }) {
  const pct = dept.occupancy_pct;
  const barColor = pct >= 85 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500";
  const bgColor = pct >= 85 ? "bg-red-50" : pct >= 60 ? "bg-amber-50" : "bg-gray-50";
  const borderColor = pct >= 85 ? "border-red-200" : pct >= 60 ? "border-amber-200" : "border-gray-200";
  const textColor = pct >= 85 ? "text-red-600" : pct >= 60 ? "text-amber-600" : "text-gray-600";

  return (
    <div
      className={`${bgColor} border ${borderColor} rounded-lg ${compact ? "p-1.5" : "p-2"} ${
        dept.is_overloaded ? "ring-1 ring-red-300" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-semibold ${textColor} truncate`}>
          {DEPT_SHORT[dept.name] || dept.name}
        </span>
        <span className={`text-[9px] font-mono font-bold ${textColor}`}>
          {Math.round(pct)}%
        </span>
      </div>
      {/* Capacity bar */}
      <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${barColor} rounded-full`}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      {!compact && (
        <div className="flex items-center justify-between mt-1 gap-1">
          <span className="text-[8px] font-mono text-gray-500">
            {dept.active_patients ?? dept.current_load}/{dept.capacity}
          </span>
          {(dept.queue_length ?? 0) > 0 && (
            <span className="text-[7px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded font-semibold">
              Q:{dept.queue_length}
            </span>
          )}
          {(dept.critical_count ?? 0) > 0 && (
            <span className="text-[7px] px-1 py-0.5 bg-red-100 text-red-700 rounded font-semibold">
              !{dept.critical_count}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Component ────────────────────────────────────── */

export default function HospitalWorkflowEngine({
  pipelineStages,
  recentTransitions,
  departmentQueues,
  systemInfo,
  tick,
  elapsedSeconds,
  isRunning,
  fifoComparison,
  aiAvgWait,
  aiCriticalWait,
}: Props) {
  /* Derive patient tokens per stage from recent transitions */
  const stagePatients = useMemo(() => {
    const map: Record<string, PatientTransition[]> = {
      arrived: [], queued: [], treating: [], discharged: [],
    };
    recentTransitions.slice().reverse().forEach((t) => {
      const stage = t.to_stage;
      if (map[stage] && map[stage].length < 8) {
        map[stage].push(t);
      }
    });
    return map;
  }, [recentTransitions]);

  const reroutedCount = recentTransitions.filter(t => t.rerouted).length;
  const totalActive = pipelineStages.arrived + pipelineStages.queued + pipelineStages.treating;
  const hasFlow = isRunning && totalActive > 0;

  return (
    <div className="section space-y-4">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500">
            <Workflow className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-900">
              Interactive Hospital Workflow Engine
            </span>
            <p className="text-[9px] text-gray-400">Live state visualization — real patient objects, real routing</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[9px]">
          <div className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-md">
            <Timer className="w-3 h-3 text-gray-400" />
            <span className="text-gray-400">t =</span>
            <span className="font-mono font-bold text-gray-900">{tick}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-md">
            <span className="text-gray-400">λ</span>
            <span className="font-mono font-bold text-gray-900">{systemInfo.arrival_rate}/min</span>
          </div>
          {isRunning && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-semibold text-blue-700 uppercase">Live</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Split View: AI Workflow + Traditional ──────── */}
      <div className="grid grid-cols-5 gap-3">

        {/* LEFT: AI-Optimized Workflow (3 cols) */}
        <div className="col-span-3">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">
              AI-Optimized Flow
            </span>
            {isRunning && (
              <div className="flex items-center gap-1 ml-auto text-[8px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                <Zap className="w-2.5 h-2.5" />
                Priority + Load Balanced
              </div>
            )}
          </div>

          {/* Vertical Workflow Pipeline */}
          <div className="flex flex-col items-stretch">
            {WORKFLOW_STAGES.map((stage, i) => {
              const colors = COLOR_MAP[stage.color];
              const count = stage.stageKey ? pipelineStages[stage.stageKey] ?? 0 : null;
              const patients = stage.stageKey ? stagePatients[stage.stageKey] || [] : [];
              const isActive = isRunning && (count === null || count > 0);

              return (
                <Fragment key={stage.key}>
                  {i > 0 && <Connector active={isActive} hasFlow={hasFlow} />}

                  <motion.div
                    className={`${colors.bg} border ${colors.border} rounded-lg p-2.5 relative ${
                      isActive ? "shadow-sm" : ""
                    }`}
                    animate={{
                      scale: isActive && count && count > 0 ? [1, 1.005, 1] : 1,
                    }}
                    transition={{ duration: 0.5, repeat: isActive ? Infinity : 0, repeatDelay: 2 }}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-md ${colors.light} flex items-center justify-center`}>
                        <stage.Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold ${colors.text}`}>
                            {stage.label}
                          </span>
                          {count !== null && (
                            <motion.span
                              key={count}
                              className={`text-[11px] font-black ${colors.text} tabular-nums`}
                              initial={{ y: -4, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            >
                              ({count})
                            </motion.span>
                          )}
                        </div>
                        <p className="text-[8px] text-gray-400">{stage.sublabel}</p>
                      </div>

                      {/* Patient Tokens */}
                      {patients.length > 0 && (
                        <div className="flex items-center gap-0.5 flex-wrap justify-end max-w-[120px]">
                          <AnimatePresence mode="popLayout">
                            {patients.slice(0, 6).map((p) => (
                              <PatientToken
                                key={p.patient_id}
                                risk={p.risk_level}
                                rerouted={p.rerouted}
                              />
                            ))}
                          </AnimatePresence>
                          {patients.length > 6 && (
                            <span className="text-[8px] text-gray-400 font-mono">
                              +{patients.length - 6}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Department routing visualization at the queue stage */}
                    {stage.key === "queue" && departmentQueues.length > 0 && (
                      <div className="mt-2 grid grid-cols-4 gap-1">
                        {departmentQueues.slice(0, 8).map((dept) => (
                          <DeptBlock key={dept.name} dept={dept} />
                        ))}
                      </div>
                    )}

                    {/* AI reroute indicator at routing stage */}
                    {stage.key === "routing" && reroutedCount > 0 && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[9px]">
                        <Shield className="w-3 h-3 text-cyan-600" />
                        <span className="text-cyan-600 font-semibold">
                          {reroutedCount} patients dynamically rerouted
                        </span>
                      </div>
                    )}
                  </motion.div>
                </Fragment>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Traditional FIFO + Live Feed (2 cols) */}
        <div className="col-span-2 flex flex-col gap-3">
          {/* Traditional FIFO Mini-Workflow */}
          {fifoComparison && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                  Traditional FIFO
                </span>
              </div>

              {/* Mini stages */}
              <div className="space-y-1.5 mb-3">
                {[
                  { label: "Queue Depth", value: fifoComparison.queue_length, icon: Clock },
                  { label: "Avg Wait", value: `${fifoComparison.avg_wait.toFixed(1)}s`, icon: Timer },
                  { label: "Critical Wait", value: `${fifoComparison.critical_avg_wait.toFixed(1)}s`, icon: Heart },
                  { label: "Overloaded", value: fifoComparison.overloaded_count, icon: AlertTriangle },
                ].map(({ label, value, icon: SIcon }) => (
                  <div key={label} className="flex items-center gap-2 px-2 py-1.5 bg-red-50 rounded border border-red-100">
                    <SIcon className="w-3 h-3 text-red-400" />
                    <span className="text-[9px] text-red-500 flex-1">{label}</span>
                    <span className="text-[10px] font-bold text-red-600 font-mono">{value}</span>
                  </div>
                ))}
              </div>

              {/* FIFO dept mini grid */}
              <div className="grid grid-cols-3 gap-1">
                {fifoComparison.departments.slice(0, 6).map((dept) => (
                  <DeptBlock key={dept.name} dept={dept} compact />
                ))}
              </div>

              {fifoComparison.overloaded_count > 0 && (
                <div className="mt-2 flex items-center gap-1 px-2 py-1 bg-red-50 rounded border border-red-200">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span className="text-[8px] text-red-600">
                    {fifoComparison.overloaded_count} dept{fifoComparison.overloaded_count > 1 ? "s" : ""} at capacity
                  </span>
                </div>
              )}
            </div>
          )}

          {/* AI vs FIFO Delta */}
          {fifoComparison && aiAvgWait !== undefined && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                  AI Impact Delta
                </span>
              </div>
              <div className="space-y-2">
                {/* Wait time delta */}
                <div>
                  <div className="text-[9px] text-gray-400 mb-0.5">Avg Wait Time</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[8px] mb-0.5">
                        <span className="text-red-500">FIFO</span>
                        <span className="font-mono text-red-600">{fifoComparison.avg_wait.toFixed(1)}s</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-red-400 rounded-full"
                          animate={{ width: `${Math.min(100, (fifoComparison.avg_wait / Math.max(fifoComparison.avg_wait, aiAvgWait || 1, 1)) * 100)}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[8px] mb-0.5">
                        <span className="text-blue-500">AI</span>
                        <span className="font-mono text-blue-600">{(aiAvgWait || 0).toFixed(1)}s</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-blue-400 rounded-full"
                          animate={{ width: `${Math.min(100, ((aiAvgWait || 0) / Math.max(fifoComparison.avg_wait, aiAvgWait || 1, 1)) * 100)}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Improvement */}
                {fifoComparison.avg_wait > 0 && (
                  <div className="flex items-center justify-center gap-1 py-1 bg-emerald-50 rounded border border-emerald-200">
                    <Shield className="w-3 h-3 text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-600">
                      {Math.round(((fifoComparison.avg_wait - (aiAvgWait || 0)) / fifoComparison.avg_wait) * 100)}% faster
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live Patient Flow Feed */}
          {recentTransitions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-3 flex-1">
              <div className="flex items-center gap-1.5 mb-2">
                <Activity className="w-3 h-3 text-gray-400" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                  Live Patient Flow
                </span>
                <span className="ml-auto text-[8px] text-gray-300 font-mono">
                  {recentTransitions.length} events
                </span>
              </div>
              <div className="space-y-0.5 max-h-52 overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {recentTransitions
                    .slice()
                    .reverse()
                    .slice(0, 12)
                    .map((t, i) => {
                      const rc = RISK_COLORS[t.risk_level] || RISK_COLORS.Low;
                      return (
                        <motion.div
                          key={`${t.patient_id}-${t.tick}-${t.to_stage}`}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.12, delay: i * 0.02 }}
                          className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded text-[9px] border border-gray-100"
                        >
                          <span className={`w-4 h-4 rounded-full ${rc.dot} flex items-center justify-center text-[7px] font-bold text-white`}>
                            {t.risk_level.charAt(0)}
                          </span>
                          <span className="text-gray-500 truncate flex-1 min-w-0">{t.name}</span>
                          <span className="text-gray-300">→</span>
                          <span className="font-semibold text-gray-700 capitalize text-[8px]">
                            {t.to_stage}
                          </span>
                          <span className="text-[8px] text-gray-400 truncate">
                            {DEPT_SHORT[t.department] || t.department}
                          </span>
                          {t.rerouted && (
                            <span className="text-[7px] px-1 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-200 flex-shrink-0">
                              ↻
                            </span>
                          )}
                        </motion.div>
                      );
                    })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── AI Optimization Indicator ─────────────────── */}
      {isRunning && reroutedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 bg-cyan-50 border border-cyan-200 rounded-lg"
        >
          <Zap className="w-4 h-4 text-cyan-600" />
          <div className="flex-1">
            <span className="text-[10px] font-semibold text-cyan-700">AI Optimization Active</span>
            <span className="text-[9px] text-cyan-500 ml-2">
              {reroutedCount} patients redistributed across departments — queue stabilizing
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-cyan-400 rounded-full"
                animate={{ height: [4, 12, 4] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
