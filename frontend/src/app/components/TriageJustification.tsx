"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText, ShieldCheck, AlertTriangle, Activity,
  Heart, Brain, Stethoscope, CheckCircle2,
} from "lucide-react";
import type { TriageResult } from "../lib/api";

interface Props {
  result: TriageResult;
  patientAge: number;
  patientSymptoms: string;
  patientConditions: string[];
}

/* ── Clinical Justification Generator ─────────────────────
   Mirrors Google Opal "Triage Justification" logic:
   Takes patient data + AI outputs → generates clinical reasoning
   explanation with risk justification and department routing rationale.
──────────────────────────────────────────────────────────── */

function generateJustification(
  result: TriageResult,
  age: number,
  symptoms: string,
  conditions: string[],
): {
  riskRationale: string;
  departmentRationale: string;
  clinicalFactors: string[];
  protocolsApplied: string[];
  confidenceNote: string;
  urgencyStatement: string;
} {
  const { risk_level, risk_score, confidence, department, clinical_rules_triggered, vital_abnormals } = result;

  // Risk rationale — derived from actual AI outputs
  const riskDescMap: Record<string, string> = {
    Critical: "immediate life-threatening condition requiring emergent intervention",
    High: "significant clinical concern with potential for rapid deterioration",
    Medium: "moderate acuity requiring timely evaluation and monitoring",
    Low: "stable presentation with low likelihood of acute deterioration",
  };

  const ageFactorStr =
    age >= 75 ? "advanced age (≥75) is an independent risk modifier" :
    age >= 65 ? "geriatric age group (65-74) increases baseline risk" :
    age <= 5 ? "pediatric patient — age-adjusted scoring applied" :
    age <= 18 ? "adolescent patient — developmental considerations noted" :
    "adult age range — standard risk model applied";

  const riskRationale =
    `Patient presents with ${riskDescMap[risk_level] || "undetermined acuity"}. ` +
    `AI risk score of ${(risk_score * 100).toFixed(1)}% (${risk_level}) computed via 7-layer hybrid model ` +
    `(ML ensemble + clinical rules + vital index). ${ageFactorStr}. ` +
    (vital_abnormals.length > 0
      ? `Vital sign abnormalities detected: ${vital_abnormals.join(", ")}. `
      : "No acute vital sign derangements identified. ") +
    (clinical_rules_triggered.length > 0
      ? `Clinical rules triggered: ${clinical_rules_triggered.join("; ")}.`
      : "No hard clinical rules triggered.");

  // Department rationale — why this department was selected
  const deptReasonMap: Record<string, string> = {
    Emergency: "Emergent presentation requiring immediate stabilization and multi-system evaluation.",
    Cardiology: "Cardiac symptom pattern detected — chest pain, arrhythmia indicators, or hemodynamic instability.",
    Neurology: "Neurological symptom complex identified — altered mental status, focal deficits, or seizure activity.",
    "General Medicine": "General medical presentation without organ-specific emergency. Appropriate for comprehensive evaluation.",
    Pulmonology: "Respiratory symptom predominance — dyspnea, hypoxia, or pulmonary infiltrate pattern.",
    "Infectious Disease": "Infection-related presentation with systemic inflammatory response indicators.",
    Surgery: "Surgical pathology suspected — acute abdomen, trauma, or surgical emergency pattern.",
    Gastroenterology: "GI-tract predominant symptoms — abdominal pain, GI bleeding, or hepatobiliary concern.",
  };

  const departmentRationale =
    `Routed to ${department}: ${deptReasonMap[department] || "Department assignment based on symptom-organ mapping and load-balanced routing."} ` +
    `AI confidence: ${(confidence * 100).toFixed(0)}%. ` +
    (result.department_fallback
      ? `Fallback department available: ${result.department_fallback} (load-balanced routing active).`
      : "Primary routing — department capacity within operational limits.");

  // Clinical factors
  const clinicalFactors: string[] = [];
  if (vital_abnormals.length > 0) clinicalFactors.push(`Abnormal vitals: ${vital_abnormals.join(", ")}`);
  if (conditions.length > 0) clinicalFactors.push(`Comorbidities: ${conditions.join(", ")}`);
  if (symptoms) clinicalFactors.push(`Presenting symptoms: ${symptoms}`);
  if (age >= 65) clinicalFactors.push("Age ≥65 — geriatric risk modifier applied");
  if (age <= 5) clinicalFactors.push("Pediatric patient — age-adjusted protocol");
  if (risk_score >= 0.75) clinicalFactors.push("Risk score ≥0.75 — critical threshold exceeded");
  if (clinical_rules_triggered.length > 0) clinicalFactors.push(`${clinical_rules_triggered.length} clinical rules activated`);
  if (clinicalFactors.length === 0) clinicalFactors.push("Standard adult presentation — no additional risk modifiers");

  // Protocols applied
  const protocolsApplied: string[] = [
    "7-Layer Hybrid Risk Classification (ML + Rules + Vitals)",
    "Load-Aware Department Routing Algorithm",
  ];
  if (risk_level === "Critical" || risk_level === "High") {
    protocolsApplied.push("Accelerated Triage Protocol (ESI Level 1-2 equivalent)");
  }
  if (vital_abnormals.length > 0) {
    protocolsApplied.push("Vital Sign Abnormality Detection Engine");
  }
  if (result.needs_manual_review) {
    protocolsApplied.push("Manual Review Flag — borderline confidence zone");
  }
  if (result.department_fallback) {
    protocolsApplied.push("Dynamic Load Balancing with Fallback Routing");
  }

  // Confidence note
  const confidenceNote =
    confidence >= 0.9 ? "High confidence classification — model agreement across all layers." :
    confidence >= 0.7 ? "Moderate-to-high confidence. Clinical review recommended for edge-case validation." :
    confidence >= 0.5 ? "Moderate confidence — borderline case. Attending physician review strongly recommended." :
    "Low confidence classification. Mandatory attending physician review required before disposition.";

  // Urgency statement
  const urgencyStatement =
    risk_level === "Critical" ? "IMMEDIATE — Patient requires emergent evaluation within 0-5 minutes. Activate rapid response if not already in monitored setting." :
    risk_level === "High" ? "URGENT — Evaluation recommended within 15 minutes. Continuous monitoring advised." :
    risk_level === "Medium" ? "SEMI-URGENT — Evaluation within 30-60 minutes. Standard monitoring protocol." :
    "NON-URGENT — Standard evaluation timeline. Patient may be triaged into scheduled workflow.";

  return { riskRationale, departmentRationale, clinicalFactors, protocolsApplied, confidenceNote, urgencyStatement };
}

/* ── Component ─────────────────────────────────────────── */

export default function TriageJustification({ result, patientAge, patientSymptoms, patientConditions }: Props) {
  const justification = useMemo(
    () => generateJustification(result, patientAge, patientSymptoms, patientConditions),
    [result, patientAge, patientSymptoms, patientConditions],
  );

  const riskColorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
    Critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", badge: "bg-red-100 text-red-700" },
    High: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", badge: "bg-orange-100 text-orange-700" },
    Medium: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", badge: "bg-yellow-100 text-yellow-700" },
    Low: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", badge: "bg-green-100 text-green-700" },
  };

  const rc = riskColorMap[result.risk_level] || riskColorMap.Low;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="section space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500">
            <FileText className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-[12px] font-bold text-gray-900">Clinical Triage Justification</h3>
            <p className="text-[9px] text-gray-400">AI-generated reasoning — powered by MedBrain Engine</p>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${rc.badge}`}>
          {result.risk_level} Risk
        </div>
      </div>

      {/* Urgency Statement */}
      <div className={`${rc.bg} border ${rc.border} rounded-lg p-3`}>
        <div className="flex items-start gap-2">
          <AlertTriangle className={`w-4 h-4 ${rc.text} mt-0.5 flex-shrink-0`} />
          <div>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${rc.text} mb-0.5`}>Urgency Assessment</div>
            <p className={`text-[11px] ${rc.text} leading-relaxed`}>{justification.urgencyStatement}</p>
          </div>
        </div>
      </div>

      {/* Risk Rationale */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Brain className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Risk Classification Rationale</span>
        </div>
        <p className="text-[11px] text-gray-700 leading-relaxed">{justification.riskRationale}</p>
      </div>

      {/* Department Routing Rationale */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Stethoscope className="w-3.5 h-3.5 text-cyan-600" />
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Department Routing Rationale</span>
        </div>
        <p className="text-[11px] text-gray-700 leading-relaxed">{justification.departmentRationale}</p>
      </div>

      {/* Two-column: Clinical Factors + Protocols */}
      <div className="grid grid-cols-2 gap-3">
        {/* Clinical Factors */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity className="w-3 h-3 text-gray-500" />
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Contributing Factors</span>
          </div>
          <ul className="space-y-1">
            {justification.clinicalFactors.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[10px] text-gray-600">
                <Heart className="w-2.5 h-2.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Protocols Applied */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldCheck className="w-3 h-3 text-gray-500" />
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Protocols Applied</span>
          </div>
          <ul className="space-y-1">
            {justification.protocolsApplied.map((p, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[10px] text-gray-600">
                <CheckCircle2 className="w-2.5 h-2.5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Confidence Note */}
      <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">Model Confidence</span>
          <p className="text-[10px] text-blue-700 mt-0.5">{justification.confidenceNote}</p>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[9px] text-gray-400 text-center italic">
        This AI-generated justification supports — but does not replace — clinical judgment.
        All triage decisions require attending physician review per hospital protocol.
      </p>
    </motion.div>
  );
}
