"use client";

import { motion } from "framer-motion";
import {
  Brain, Shield, Activity, Zap, ArrowRight, Layers,
  Building2, BarChart3, Eye,
} from "lucide-react";

interface Props {
  onEnter: () => void;
}

const STATS = [
  { value: "7", label: "Layer Architecture", icon: Layers, color: "#3b82f6" },
  { value: "6", label: "Stress Scenarios", icon: Building2, color: "#06b6d4" },
  { value: "< 50ms", label: "Triage Latency", icon: Zap, color: "#22c55e" },
  { value: "94%", label: "Hybrid Accuracy", icon: BarChart3, color: "#a855f7" },
];

const STEPS = [
  {
    num: "01",
    title: "Patient Intake",
    desc: "Voice-enabled symptom capture + vital signs + pre-existing conditions",
    icon: Activity,
    color: "#3b82f6",
  },
  {
    num: "02",
    title: "AI Risk Assessment",
    desc: "7-layer hybrid engine: XGBoost ML + Clinical Rules + Vital Abnormality Index + NLP",
    icon: Brain,
    color: "#06b6d4",
  },
  {
    num: "03",
    title: "Smart Routing",
    desc: "Load-aware department assignment with automatic rerouting and protocol-based explainability",
    icon: Shield,
    color: "#22c55e",
  },
];

const FEATURES = [
  "SHAP Explainability",
  "Hospital Digital Twin",
  "Clinical Protocol Engine",
  "Fairness Auditing",
  "Data Drift Monitoring",
  "Operational Recommendations",
  "EHR Document Extraction",
  "Voice-Enabled Intake",
];

export default function LandingPage({ onEnter }: Props) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* ── HERO ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-blue-50/50 rounded-full blur-[80px] pointer-events-none" />

        {/* Logo + Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center relative z-10"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Brain className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-2">
            MedBrain
          </h1>
          <p className="text-sm md:text-base text-blue-600 font-semibold uppercase tracking-[0.25em] mb-4">
            AI-Powered Hospital Triage System
          </p>
          <p className="text-sm md:text-base text-gray-500 max-w-xl mx-auto leading-relaxed">
            A 7-layer hybrid intelligence engine that combines machine learning,
            clinical protocols, and real-time hospital simulation to optimize
            emergency department flow — with full explainability and fairness auditing.
          </p>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 relative z-10"
        >
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center gap-1 px-6 py-4 rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <s.icon className="w-5 h-5 mb-1" style={{ color: s.color }} />
              <span className="text-2xl font-extrabold text-gray-900">{s.value}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={onEnter}
          className="mt-10 relative z-10 flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-md shadow-blue-600/10 transition-colors"
        >
          Launch Command Center
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="border-t border-gray-200 bg-gray-50 py-14 px-6"
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <Eye className="w-5 h-5 text-blue-600 mx-auto mb-2" />
            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wider">How It Works</h2>
            <p className="text-xs text-gray-500 mt-1">Three-stage intelligent pipeline</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 + i * 0.15 }}
                className="relative p-5 rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-xs font-extrabold tracking-wider"
                    style={{ color: step.color }}
                  >
                    {step.num}
                  </span>
                  <step.icon className="w-4 h-4" style={{ color: step.color }} />
                  <span className="text-sm font-bold text-gray-900">{step.title}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Features strip ────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.4 }}
        className="border-t border-gray-200 py-6 px-6"
      >
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-3">
          {FEATURES.map((f) => (
            <span
              key={f}
              className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 border border-gray-200 rounded-full bg-gray-50"
            >
              {f}
            </span>
          ))}
        </div>
      </motion.div>

      {/* ── Footer ────────────────────────────────── */}
      <footer className="border-t border-gray-200 py-3 text-center">
        <span className="text-[9px] text-gray-400">
          MedBrain v4.0 — Built for hackathon demonstration purposes. Not for clinical use.
        </span>
      </footer>
    </div>
  );
}
