"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ShieldCheck, UserCheck, Gauge, Brain, FileCheck,
  AlertTriangle, ArrowUpCircle, Bell, Activity,
  CheckCircle, Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Types ─────────────────────────────────────────────── */

interface SafetyEvent {
  id: string;
  timestamp: number;
  type: "low_confidence" | "auto_escalate" | "overflow" | "manual_review";
  severity: "warning" | "critical";
  title: string;
  detail: string;
  patientId?: string;
  resolved: boolean;
}

interface Props {
  latestResult?: {
    patient_id: string;
    risk_level: string;
    risk_score: number;
    confidence: number;
    department: string;
    needs_manual_review: boolean;
    clinical_rules_triggered?: string[];
  } | null;
  overloadedDepts?: number;
  systemMode?: "NORMAL" | "SURGE" | "EMERGENCY";
}

const SAFEGUARDS = [
  { icon: UserCheck, title: "Human Override", desc: "Clinician overrides any AI recommendation", active: true },
  { icon: Gauge, title: "Confidence Threshold", desc: "Auto-flags cases below 60% for review", active: true },
  { icon: Brain, title: "No Autonomous Decisions", desc: "AI assists — never replaces judgment", active: true },
  { icon: FileCheck, title: "Decision Support Only", desc: "Outputs are recommendations, not orders", active: true },
];

const ESCALATION_RULES = [
  { trigger: "Confidence < 60%", action: "→ Manual Review", color: "text-amber-600" },
  { trigger: "Critical + Medium Score", action: "→ Auto-Escalate", color: "text-red-600" },
  { trigger: "Dept Overloaded", action: "→ Overflow Protocol", color: "text-orange-600" },
  { trigger: "Vital Abnormality > 0.6", action: "→ Immediate Triage", color: "text-red-600" },
];

export default function FailSafePanel({ latestResult, overloadedDepts = 0 }: Props) {
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const processedRef = useRef<Set<string>>(new Set());
  const prevOverloadRef = useRef(0);

  const addSafetyEvents = useCallback((newEvents: SafetyEvent[]) => {
    if (newEvents.length > 0) setEvents(prev => [...newEvents, ...prev].slice(0, 20));
  }, []);

  // Process triage results into safety events
  const latestId = latestResult?.patient_id;
  useEffect(() => {
    if (!latestResult || !latestId) return;
    if (processedRef.current.has(latestId)) return;
    processedRef.current.add(latestId);

    const ts = Math.floor(performance.now()) / 1000 + (Date.now() / 1000 - performance.now() / 1000);
    const batch: SafetyEvent[] = [];

    if (latestResult.confidence < 0.6) {
      batch.push({
        id: `lc-${latestId}`, timestamp: ts, type: "low_confidence", severity: "warning",
        title: "Low Confidence — Manual Review Required",
        detail: `Patient ${latestId.slice(0,8)} — confidence ${(latestResult.confidence * 100).toFixed(1)}% (threshold: 60%)`,
        patientId: latestId, resolved: false,
      });
    }

    const hasCriticalSymptoms = (latestResult.clinical_rules_triggered || []).some(
      r => r.toLowerCase().includes("critical") || r.toLowerCase().includes("sepsis") || r.toLowerCase().includes("stroke")
    );
    if (hasCriticalSymptoms && latestResult.risk_level === "Medium") {
      batch.push({
        id: `ae-${latestId}`, timestamp: ts, type: "auto_escalate", severity: "critical",
        title: "Safety Override — Auto-Escalation Triggered",
        detail: `Patient ${latestId.slice(0,8)} flagged Medium but has critical symptoms. Escalated to High.`,
        patientId: latestId, resolved: false,
      });
    }

    if (latestResult.needs_manual_review && latestResult.confidence >= 0.6) {
      batch.push({
        id: `mr-${latestId}`, timestamp: ts, type: "manual_review", severity: "warning",
        title: "Manual Review Requested",
        detail: `Patient ${latestId.slice(0,8)} — engine recommends clinician verification.`,
        patientId: latestId, resolved: false,
      });
    }

    addSafetyEvents(batch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestId]);

  // Overflow detection
  useEffect(() => {
    if (overloadedDepts <= 0) { prevOverloadRef.current = 0; return; }
    if (overloadedDepts === prevOverloadRef.current) return;
    prevOverloadRef.current = overloadedDepts;
    const ts = Math.floor(performance.now()) / 1000 + (Date.now() / 1000 - performance.now() / 1000);
    addSafetyEvents([{
      id: `of-${performance.now()}`, timestamp: ts, type: "overflow",
      severity: overloadedDepts >= 3 ? "critical" : "warning",
      title: "Emergency Overflow Protocol",
      detail: `${overloadedDepts} department${overloadedDepts > 1 ? "s" : ""} at capacity. Overflow bays recommended.`,
      resolved: false,
    }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overloadedDepts]);

  const resolveEvent = (id: string) => setEvents(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e));

  const unresolvedCount = events.filter(e => !e.resolved).length;
  const criticalCount = events.filter(e => e.severity === "critical" && !e.resolved).length;

  const formatTime = (ts: number) =>
    new Date(ts * 1000).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="space-y-3">
      {/* Safeguards */}
      <div className="section">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Responsible AI Safeguards</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200">
            <CheckCircle className="w-3 h-3 text-green-600" />
            <span className="text-[9px] font-bold text-green-600">ALL ACTIVE</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SAFEGUARDS.map(s => (
            <div key={s.title} className="flex items-start gap-2 p-2 rounded-md bg-green-50 border border-green-200">
              <div className="mt-0.5 w-4 h-4 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-green-700">{s.title}</div>
                <div className="text-[9px] text-gray-400 mt-0.5">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Escalation Rules */}
      <div className="section">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Escalation Rules Engine</span>
        </div>
        <div className="space-y-1">
          {ESCALATION_RULES.map(r => (
            <div key={r.trigger} className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded border border-gray-200 text-[10px]">
              <ArrowUpCircle className={`w-3 h-3 ${r.color} shrink-0`} />
              <span className="text-gray-600 flex-1">{r.trigger}</span>
              <span className={`font-bold ${r.color}`}>{r.action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live Safety Events */}
      <div className="section">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Safety Event Log</span>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <span className="text-[9px] font-bold text-red-600 px-1.5 py-0.5 bg-red-50 rounded border border-red-200">{criticalCount} CRITICAL</span>
            )}
            {unresolvedCount > 0 ? (
              <span className="text-[9px] font-bold text-amber-600 px-1.5 py-0.5 bg-amber-50 rounded border border-amber-200">{unresolvedCount} unresolved</span>
            ) : (
              <span className="text-[9px] text-gray-400">No active events</span>
            )}
          </div>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-4">
            <ShieldCheck className="w-8 h-8 text-green-300 mx-auto mb-2" />
            <p className="text-[10px] text-gray-400">No safety events — system operating normally</p>
            <p className="text-[9px] text-gray-300 mt-0.5">Triage patients to activate safety monitoring</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {events.slice(0, 10).map((e) => {
                const isCrit = e.severity === "critical";
                const TypeIcon = e.type === "low_confidence" ? Gauge : e.type === "auto_escalate" ? AlertTriangle : e.type === "overflow" ? Activity : FileCheck;
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: e.resolved ? 0.5 : 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`flex items-start gap-2 px-2.5 py-2 rounded border ${e.resolved ? "bg-gray-50 border-gray-200" : isCrit ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}
                  >
                    <TypeIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${e.resolved ? "text-gray-400" : isCrit ? "text-red-500" : "text-amber-500"}`} />
                    <div className="flex-1 min-w-0">
                      <span className={`text-[10px] font-bold ${e.resolved ? "text-gray-500" : isCrit ? "text-red-700" : "text-amber-700"}`}>{e.title}</span>
                      <p className="text-[9px] text-gray-500 mt-0.5">{e.detail}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] text-gray-400 font-mono">{formatTime(e.timestamp)}</span>
                        {!e.resolved && (
                          <button onClick={() => resolveEvent(e.id)} className="text-[8px] text-blue-600 hover:text-blue-800 font-semibold uppercase">Acknowledge</button>
                        )}
                        {e.resolved && <span className="text-[8px] text-green-600 font-semibold">Resolved</span>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
