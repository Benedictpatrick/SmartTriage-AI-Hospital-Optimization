"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  PatientInput, TriageResult, DepartmentStatus, VitalsInput,
  predictTriage, getDepartmentLoads, getHealthStatus,
} from "../lib/api";
import PatientForm from "./PatientForm";
import RiskGauge from "./RiskGauge";
import ShapChart from "./ShapChart";
import DeptHeatmap from "./DeptHeatmap";
import SimulationView from "./SimulationView";
import FairnessDash from "./FairnessDash";
import StatusBar from "./StatusBar";
import AlertBanner from "./AlertBanner";
import VitalTags from "./VitalTags";
import FailSafePanel from "./FailSafePanel";
import TriageHistoryMini from "./TriageHistoryMini";
import EventLog from "./EventLog";
import ProtocolPanel from "./ProtocolPanel";
import ClinicalAssistant from "./ClinicalAssistant";
import DeploymentVision from "./DeploymentVision";
import OperationalRecommendations from "./OperationalRecommendations";
import RiskHistogram from "./RiskHistogram";
import ModelMonitoring from "./ModelMonitoring";
import EdgeCaseDemo from "./EdgeCaseDemo";
import EHRUpload from "./EHRUpload";
import SurgeForecaster from "./SurgeForecaster";
import AuditLog, { AuditEntry } from "./AuditLog";
import WhatIfControls, { WhatIfParams } from "./WhatIfControls";
import MultiHospitalView from "./MultiHospitalView";
import TriageJustification from "./TriageJustification";
import {
  Brain, Scale, Heart, Server,
  AlertTriangle, Keyboard, ChevronDown, ChevronUp, Building2, Monitor,
  Zap, User, Volume2, VolumeX,
} from "lucide-react";

type Tab = "triage" | "simulation" | "analytics" | "system";
type SystemMode = "NORMAL" | "SURGE" | "EMERGENCY";

export default function Dashboard({ role = "Admin" }: { role?: string }) {
  const [tab, setTab] = useState<Tab>("triage");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [departments, setDepartments] = useState<DepartmentStatus[]>([]);
  const [triageHistory, setTriageHistory] = useState<TriageResult[]>([]);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [alertRisk, setAlertRisk] = useState<"High" | "Critical" | null>(null);
  const [lastVitals, setLastVitals] = useState<VitalsInput | null>(null);
  const [shapExpanded, setShapExpanded] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [whatIfParams, setWhatIfParams] = useState<WhatIfParams>({
    arrivalRate: 1.0, capacity: 100, serviceTime: 1.0, criticalRatio: 10, aiEnabled: true,
  });
  const [lastPatientInput, setLastPatientInput] = useState<PatientInput | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const triageStartRef = useRef<number>(Date.now());

  /* ── Audio System ──────────────────────────────── */

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  // Critical: two-tone ICU alarm (880→660 Hz)
  const playCriticalAlert = useCallback(() => {
    if (!audioEnabled) return;
    try {
      const ctx = getCtx();
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine"; osc1.frequency.value = 880;
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc1.connect(gain1).connect(ctx.destination);
      osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine"; osc2.frequency.value = 660;
      gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.3); osc2.stop(ctx.currentTime + 0.6);
    } catch { /* browser autoplay block */ }
  }, [audioEnabled, getCtx]);

  // Overload warning: softer low-frequency pulse (220Hz)
  const playOverloadWarning = useCallback(() => {
    if (!audioEnabled) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle"; osc.frequency.value = 220;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }, [audioEnabled, getCtx]);

  // AI optimization: subtle ascending chime (523→784 Hz)
  const playOptimizationTone = useCallback(() => {
    if (!audioEnabled) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(784, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }, [audioEnabled, getCtx]);

  // Notification chime: gentle ding (1047 Hz)
  const playNotificationChime = useCallback(() => {
    if (!audioEnabled) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = 1047;
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }, [audioEnabled, getCtx]);

  /* ── Derived State ──────────────────────────────── */

  const avgWaitTime = triageHistory.length > 0
    ? Math.round(((Date.now() - triageStartRef.current) / 1000 / 60) / triageHistory.length * 10) / 10
    : 0;

  const highRiskCount = triageHistory.filter(
    (h) => h.risk_level === "High" || h.risk_level === "Critical"
  ).length;
  const overloadedDeptCount = departments.filter((d) => d.is_overloaded).length;
  const systemMode: SystemMode =
    overloadedDeptCount >= 3 || highRiskCount >= 10
      ? "EMERGENCY"
      : overloadedDeptCount >= 1 || highRiskCount >= 5
        ? "SURGE"
        : "NORMAL";

  // Overload audio trigger
  const prevOverloadRef = useRef(0);
  useEffect(() => {
    if (overloadedDeptCount > prevOverloadRef.current && overloadedDeptCount > 0) {
      playOverloadWarning();
    }
    prevOverloadRef.current = overloadedDeptCount;
  }, [overloadedDeptCount, playOverloadWarning]);

  const MODE_COLORS: Record<SystemMode, { bg: string; text: string; dot: string }> = {
    NORMAL: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-500" },
    SURGE: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-500" },
    EMERGENCY: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-500" },
  };
  const modeStyle = MODE_COLORS[systemMode];

  useEffect(() => {
    getHealthStatus()
      .then(() => setApiStatus("online"))
      .catch(() => setApiStatus("offline"));
    getDepartmentLoads()
      .then((d) => setDepartments(d.departments))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "1") setTab("triage");
      else if (e.key === "2") setTab("simulation");
      else if (e.key === "3") setTab("analytics");
      else if (e.key === "4") setTab("system");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleTriage = async (patient: PatientInput) => {
    setIsLoading(true);
    setLastVitals(patient.vitals);
    setLastPatientInput(patient);
    const startMs = Date.now();
    try {
      const res = await predictTriage(patient);
      const elapsed = Date.now() - startMs;
      setPreviousScore(result?.risk_score ?? null);
      setResult(res);
      setTriageHistory((h) => [res, ...h].slice(0, 30));

      // Audit entry
      const entry: AuditEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now() / 1000,
        patientId: res.patient_id,
        riskLevel: res.risk_level as AuditEntry["riskLevel"],
        riskScore: res.risk_score,
        confidence: res.confidence,
        department: res.department,
        mode: aiEnabled ? "AI" : "Traditional",
        rationale: res.explanation_text || res.explanation?.map((e: { feature: string }) => e.feature).join(", ") || "Standard protocol",
        manualReview: res.needs_manual_review,
        responseTimeMs: elapsed,
      };
      setAuditEntries(prev => [entry, ...prev].slice(0, 100));

      // Audio alerts
      if (res.risk_level === "High" || res.risk_level === "Critical") {
        setAlertRisk(res.risk_level as "High" | "Critical");
        if (res.risk_level === "Critical") playCriticalAlert();
        setTimeout(() => setAlertRisk(null), 8000);
      } else {
        playNotificationChime();
      }
      if (aiEnabled && res.department) playOptimizationTone();

      getDepartmentLoads().then((d) => setDepartments(d.departments)).catch(() => {});
    } catch (err) {
      console.error(err);
      alert("Triage failed. Check if backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; key: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "triage", label: "Triage", key: "1", Icon: Heart },
    { id: "simulation", label: "Digital Twin", key: "2", Icon: Building2 },
    { id: "analytics", label: "Analytics", key: "3", Icon: Scale },
    { id: "system", label: "System", key: "4", Icon: Server },
  ];

  // Presentation mode: load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("medbrain-presentation");
    if (saved === "true") setPresentationMode(true);
  }, []);

  useEffect(() => {
    if (presentationMode) {
      document.body.classList.add("presentation-mode");
      localStorage.setItem("medbrain-presentation", "true");
    } else {
      document.body.classList.remove("presentation-mode");
      localStorage.setItem("medbrain-presentation", "false");
    }
  }, [presentationMode]);

  return (
    <div className="min-h-screen flex" style={{ background: "var(--background)" }}>
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="w-[60px] bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-1 sticky top-0 h-screen z-50 shrink-0">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
          <Brain className="w-5 h-5 text-white" />
        </div>
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            title={label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              tab === id
                ? "bg-blue-50 text-blue-600"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Icon className="w-[18px] h-[18px]" />
          </button>
        ))}
        <div className="mt-auto flex flex-col items-center gap-2">
          <div className="flex items-center justify-center">
            <span className={`status-dot ${apiStatus === "online" ? "status-online" : apiStatus === "offline" ? "status-offline" : "status-checking"}`} />
          </div>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* ── Header ──────────────────────────────────── */}
        <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
          <div className="px-5 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-[14px] font-bold text-gray-900 tracking-tight">
                {tab === "triage" ? "Triage" : tab === "simulation" ? "Digital Twin" : tab === "analytics" ? "Analytics" : "System"}
              </h1>
              <span className="text-[10px] text-gray-400 font-medium">MedBrain</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Role Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50">
                <User className="w-3 h-3 text-gray-500" />
                <span className="text-[9px] font-semibold text-gray-600 uppercase tracking-wider">{role}</span>
              </div>

              {/* System Mode Badge */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 ${modeStyle.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${modeStyle.dot} ${systemMode === "EMERGENCY" ? "animate-pulse" : ""}`} />
                <span className={`text-[9px] font-bold uppercase tracking-wider ${modeStyle.text}`}>
                  {systemMode}
                </span>
              </div>

              {/* AI ON/OFF Toggle */}
              <button
                onClick={() => setAiEnabled(!aiEnabled)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all duration-300 ${
                  aiEnabled
                    ? "bg-blue-50 text-blue-600 border-blue-200"
                    : "bg-red-50 text-red-600 border-red-200"
                }`}
                title={aiEnabled ? "Disable AI Engine" : "Enable AI Engine"}
              >
                <Zap className={`w-3 h-3 ${aiEnabled ? "" : "opacity-50"}`} />
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  AI {aiEnabled ? "ON" : "OFF"}
                </span>
              </button>

              {/* Audio Toggle */}
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                  audioEnabled
                    ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                    : "bg-gray-50 text-gray-400 border-gray-200"
                }`}
                title={audioEnabled ? "Mute alerts" : "Unmute alerts"}
              >
                {audioEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                <span className="text-[8px] font-bold uppercase tracking-wider">
                  {audioEnabled ? "Sound" : "Muted"}
                </span>
              </button>

              {/* Presentation Mode Toggle */}
              <button
                onClick={() => setPresentationMode(!presentationMode)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                  presentationMode
                    ? "bg-amber-50 text-amber-600 border-amber-200"
                    : "bg-gray-50 text-gray-500 border-gray-200 hover:text-gray-600"
                }`}
                title={presentationMode ? "Disable Presentation Mode" : "Enable Presentation Mode (larger fonts)"}
              >
                <Monitor className="w-3 h-3" />
                <span className="text-[8px] font-bold uppercase tracking-wider">
                  {presentationMode ? "Presenting" : "Present"}
                </span>
              </button>

              {/* API Status */}
              <div className="flex items-center gap-1.5">
                <span className={`status-dot ${apiStatus === "online" ? "status-online" : apiStatus === "offline" ? "status-offline" : "status-checking"}`} />
                <span className="text-[9px] text-gray-400 uppercase tracking-wider">
                  {apiStatus === "online" ? "Live" : apiStatus === "offline" ? "Offline" : "..."}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Status Bar ──────────────────────────────── */}
        <StatusBar
          queueSize={triageHistory.length}
          highRiskCount={highRiskCount}
          overloadedDepts={overloadedDeptCount}
          avgWaitTime={avgWaitTime}
          apiStatus={apiStatus}
        />

        {/* ── Main ────────────────────────────────────── */}
        <main className="flex-1 px-4 py-3">
          <AlertBanner
            riskLevel={alertRisk}
            patientId={result?.patient_id}
            department={result?.department}
            onDismiss={() => setAlertRisk(null)}
          />

          {apiStatus === "offline" && (
            <div className="mb-2 bg-red-50 border border-red-200 rounded-xl p-2 flex items-center gap-2 text-red-700 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5" />
              Backend offline. Start: <code className="bg-red-100 px-1.5 py-0.5 rounded text-[10px] font-mono">cd backend &amp;&amp; uvicorn app.main:app --port 8002</code>
            </div>
          )}

          {/* ─── TRIAGE TAB ─── */}
          {tab === "triage" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Left: Intake */}
              <div className="lg:col-span-3 space-y-3">
                <PatientForm onSubmit={handleTriage} isLoading={isLoading} />
              </div>

              {/* Center: Risk */}
              <div className="lg:col-span-6 space-y-3">
                <RiskGauge result={result} previousScore={previousScore} />

                {lastVitals && (
                  <div className="section py-2 px-3">
                    <div className="section-title mb-1.5">Vital Signs</div>
                    <VitalTags
                      vitals={{
                        heart_rate: lastVitals.heart_rate,
                        systolic_bp: lastVitals.bp_systolic,
                        diastolic_bp: lastVitals.bp_diastolic,
                        spo2: lastVitals.spo2,
                        temperature: lastVitals.temperature,
                        respiratory_rate: lastVitals.respiratory_rate,
                      }}
                    />
                  </div>
                )}

                <ProtocolPanel result={result} />

                {result && lastPatientInput && (
                  <TriageJustification
                    result={result}
                    patientAge={lastPatientInput.age}
                    patientSymptoms={lastPatientInput.symptoms_text}
                    patientConditions={lastPatientInput.conditions}
                  />
                )}

                {result && (
                  <div className="section py-2 px-3">
                    <button
                      onClick={() => setShapExpanded(!shapExpanded)}
                      className="w-full flex items-center justify-between"
                    >
                      <span className="section-title">SHAP Explainability</span>
                      {shapExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                    </button>
                    {shapExpanded && (
                      <div className="mt-2 animate-fade-in">
                        <ShapChart features={result.explanation} explanationText={result.explanation_text} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Event Log + Dept + History + Recommendations */}
              <div className="lg:col-span-3 flex flex-col gap-3">
                <div className="flex-1">
                  <EventLog />
                </div>
                <DeptHeatmap departments={departments} />
                <TriageHistoryMini history={triageHistory} />
                <OperationalRecommendations />
                {triageHistory.length > 0 && (
                  <RiskHistogram
                    distribution={triageHistory.reduce((acc, h) => {
                      acc[h.risk_level] = (acc[h.risk_level] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)}
                    compact
                  />
                )}
              </div>
            </div>
          )}

          {/* ─── SIMULATION / DIGITAL TWIN TAB ─── */}
          {tab === "simulation" && (
            <div className="space-y-3">
              <SimulationView />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-w-5xl mx-auto">
                <WhatIfControls activeParams={whatIfParams} onParamsChange={setWhatIfParams} />
                <MultiHospitalView />
              </div>
            </div>
          )}

          {/* ─── ANALYTICS TAB ─── */}
          {tab === "analytics" && (
            <div className="space-y-3">
              <div className="max-w-5xl mx-auto"><SurgeForecaster /></div>
              <div className="max-w-5xl mx-auto"><ModelMonitoring /></div>
              <div className="max-w-5xl mx-auto"><FairnessDash /></div>
              <div className="max-w-5xl mx-auto">
                <FailSafePanel
                  latestResult={result ? {
                    patient_id: result.patient_id,
                    risk_level: result.risk_level,
                    risk_score: result.risk_score,
                    confidence: result.confidence,
                    department: result.department,
                    needs_manual_review: result.needs_manual_review,
                    clinical_rules_triggered: result.clinical_rules_triggered,
                  } : null}
                  overloadedDepts={overloadedDeptCount}
                  systemMode={systemMode}
                />
              </div>
              <div className="max-w-5xl mx-auto">
                <AuditLog entries={auditEntries} />
              </div>
            </div>
          )}

          {/* ─── SYSTEM TAB ─── */}
          {tab === "system" && (
            <div className="space-y-3 max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <DeploymentVision />
                <ClinicalAssistant />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <EdgeCaseDemo />
                <EHRUpload />
              </div>
            </div>
          )}
        </main>

        {/* ── Footer ──────────────────────────────────── */}
        <footer className="border-t border-gray-200 py-1.5 mt-3">
          <div className="px-5 flex items-center justify-between text-[9px] text-gray-400">
            <span>MedBrain v4.0 — AI-Powered Hospital Flow Optimization  |  by Breakform</span>
            <div className="flex items-center gap-3">
              <span className="hidden lg:inline">Hybrid Risk · Protocol Explainer · SHAP · Load Balancing · Digital Twin · Fairness</span>
              <span className="flex items-center gap-1 text-gray-400">
                <Keyboard className="w-3 h-3" /> 1-4
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
