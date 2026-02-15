"use client";

import { Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, Clock, Stethoscope, CheckCircle,
  ArrowRight, Activity, Timer, Zap, GitBranch,
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

interface Props {
  pipelineStages: PipelineStages;
  recentTransitions: PatientTransition[];
  departmentQueues: DeptQueueInfo[];
  systemInfo: SystemInfo;
  tick: number;
  elapsedSeconds: number;
  isRunning: boolean;
}

/* ── Constants ─────────────────────────────────────────── */

const RISK_BADGE: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Low: "bg-green-100 text-green-700 border-green-200",
};

const STAGE_CONFIG = [
  { key: "arrived",    label: "Intake",      Icon: UserPlus,    color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200" },
  { key: "queued",     label: "Queue",       Icon: Clock,       color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200" },
  { key: "treating",   label: "Treating",    Icon: Stethoscope, color: "text-cyan-600",    bg: "bg-cyan-50",    border: "border-cyan-200" },
  { key: "discharged", label: "Discharged",  Icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
];

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

/* ── Component ─────────────────────────────────────────── */

export default function PatientFlowPipeline({
  pipelineStages,
  recentTransitions,
  departmentQueues,
  systemInfo,
  tick,
  elapsedSeconds,
  isRunning,
}: Props) {
  return (
    <div className="section space-y-4">
      {/* ── System Indicators ─────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Patient Flow Pipeline
          </span>
        </div>
        <div className="flex items-center gap-3 text-[9px]">
          <div className="flex items-center gap-1">
            <Timer className="w-3 h-3 text-gray-400" />
            <span className="text-gray-400">t =</span>
            <span className="font-mono font-bold text-gray-900">{tick}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">Elapsed</span>
            <span className="font-mono font-bold text-gray-900">{elapsedSeconds}s</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">λ =</span>
            <span className="font-mono font-bold text-gray-900">{systemInfo.arrival_rate}/min</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">μ =</span>
            <span className="font-mono font-bold text-gray-900">{systemInfo.avg_service_ticks} ticks</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">Cap</span>
            <span className="font-mono font-bold text-gray-900">{systemInfo.total_capacity}</span>
          </div>
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${
              isRunning
                ? "bg-green-50 border-green-200"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isRunning ? "bg-green-500 animate-pulse" : "bg-gray-300"
              }`}
            />
            <span
              className={`font-semibold uppercase ${
                isRunning ? "text-green-700" : "text-gray-400"
              }`}
            >
              {isRunning ? "Sim Running" : "Idle"}
            </span>
          </div>
          {isRunning && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200">
              <Zap className="w-3 h-3 text-blue-600" />
              <span className="font-semibold text-blue-700 uppercase">AI Optimizer Active</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Pipeline Stages ───────────────────────────── */}
      <div className="flex items-center gap-1.5">
        {STAGE_CONFIG.map((stage, i) => (
          <Fragment key={stage.key}>
            {i > 0 && (
              <div className="flex items-center px-1">
                <ArrowRight className="w-4 h-4 text-gray-300" />
              </div>
            )}
            <motion.div
              className={`flex-1 ${stage.bg} border ${stage.border} rounded-lg p-3 text-center min-w-0`}
              animate={{
                scale: pipelineStages[stage.key] > 0
                  ? [1, 1.015, 1] : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              <stage.Icon className={`w-4 h-4 ${stage.color} mx-auto mb-1`} />
              <motion.div
                key={pipelineStages[stage.key]}
                className={`text-xl font-black ${stage.color} tabular-nums`}
                initial={{ y: -4, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                {pipelineStages[stage.key]}
              </motion.div>
              <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                {stage.label}
              </div>
            </motion.div>
          </Fragment>
        ))}
      </div>

      {/* ── Live Patient Flow Feed ────────────────────── */}
      {recentTransitions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <GitBranch className="w-3 h-3 text-gray-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
              Live Patient Flow
            </span>
          </div>
          <div className="space-y-0.5 max-h-40 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {recentTransitions
                .slice()
                .reverse()
                .slice(0, 10)
                .map((t, i) => (
                  <motion.div
                    key={`${t.patient_id}-${t.tick}-${t.to_stage}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15, delay: i * 0.02 }}
                    className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded text-[10px] border border-gray-100"
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                        RISK_BADGE[t.risk_level] || "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                    >
                      {t.risk_level.charAt(0)}
                    </span>
                    <span className="text-gray-500 truncate w-24">{t.name}</span>
                    <span className="text-gray-300">→</span>
                    <span className="font-semibold text-gray-700 capitalize">
                      {t.to_stage}
                    </span>
                    <span className="text-gray-400 truncate ml-auto text-[9px]">
                      {DEPT_SHORT[t.department] || t.department}
                    </span>
                    {t.rerouted && (
                      <span className="text-[8px] px-1 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-200 flex-shrink-0">
                        Rerouted
                      </span>
                    )}
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Department Queue Grid ─────────────────────── */}
      <div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
          Department Capacity &amp; Queues
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {departmentQueues.map((dept) => {
            const pct = dept.occupancy_pct;
            const barColor =
              pct >= 85 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500";
            const bgColor =
              pct >= 85 ? "bg-red-50" : pct >= 60 ? "bg-amber-50" : "bg-gray-50";
            const borderColor =
              pct >= 85
                ? "border-red-200"
                : pct >= 60
                  ? "border-amber-200"
                  : "border-gray-200";

            return (
              <div
                key={dept.name}
                className={`${bgColor} border ${borderColor} rounded-lg p-2 ${
                  dept.is_overloaded ? "ring-1 ring-red-300 animate-pulse" : ""
                }`}
              >
                <div className="text-[9px] font-semibold text-gray-600 truncate">
                  {DEPT_SHORT[dept.name] || dept.name}
                </div>
                {/* Capacity bar */}
                <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${barColor} rounded-full`}
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1 gap-1">
                  <span className="text-[9px] font-mono text-gray-500">
                    {dept.active_patients ?? dept.current_load}/{dept.capacity}
                  </span>
                  {(dept.queue_length ?? 0) > 0 && (
                    <span className="text-[8px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded font-semibold">
                      Q:{dept.queue_length}
                    </span>
                  )}
                  {(dept.critical_count ?? 0) > 0 && (
                    <span className="text-[8px] px-1 py-0.5 bg-red-100 text-red-700 rounded font-semibold">
                      !{dept.critical_count}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
