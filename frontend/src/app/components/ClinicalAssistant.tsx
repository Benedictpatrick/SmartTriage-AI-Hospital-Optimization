"use client";

import { useState } from "react";
import { Search, BookOpen, AlertTriangle, Heart, Brain, Wind, Thermometer, Droplets } from "lucide-react";

// Rule-based clinical knowledge — NO LLM
const CLINICAL_KNOWLEDGE: Record<string, {
  title: string;
  icon: typeof Heart;
  description: string;
  criteria: string[];
  actions: string[];
  guideline: string;
}> = {
  chest_pain: {
    title: "Acute Coronary Syndrome",
    icon: Heart,
    description: "Chest pain, tightness, or pressure — must rule out MI/ACS in all patients over 35",
    criteria: [
      "STEMI: ST elevation ≥1mm in ≥2 contiguous leads",
      "NSTEMI: Troponin elevation without ST elevation",
      "Unstable Angina: Clinical presentation without biomarker rise",
    ],
    actions: [
      "12-lead ECG within 10 minutes of arrival",
      "Serial Troponin I/T at 0 and 3 hours",
      "Aspirin 325mg chewed (unless allergic)",
      "Nitroglycerin 0.4mg SL if SBP > 90",
      "Cardiology consult if positive findings",
    ],
    guideline: "AHA/ACC 2021 Chest Pain Guidelines",
  },
  sepsis: {
    title: "Sepsis / Septic Shock",
    icon: Thermometer,
    description: "Life-threatening organ dysfunction due to dysregulated host response to infection",
    criteria: [
      "qSOFA ≥ 2: RR ≥ 22, SBP ≤ 100, Altered mentation",
      "SIRS: Temp >38.3°C or <36°C, HR > 90, RR > 20, WBC abnormal",
      "Septic shock: Sepsis + vasopressors needed + Lactate > 2",
    ],
    actions: [
      "Blood cultures × 2 before antibiotics",
      "Serum Lactate level (repeat if > 2 mmol/L)",
      "Broad-spectrum IV antibiotics within 1 HOUR",
      "30 mL/kg IV crystalloid for hypotension",
      "MAP target ≥ 65 mmHg — norepinephrine first-line",
    ],
    guideline: "Surviving Sepsis Campaign 2021",
  },
  stroke: {
    title: "Acute Stroke (FAST Protocol)",
    icon: Brain,
    description: "Sudden neurological deficit — time-critical for thrombolytic window",
    criteria: [
      "Face: Asymmetric facial droop",
      "Arms: Unilateral arm drift/weakness",
      "Speech: Slurred or incoherent speech",
      "Time: Onset time critical — tPA window 4.5 hours",
    ],
    actions: [
      "CT Head without contrast — STAT (door to CT < 20 min)",
      "Neurology alert/consult immediately",
      "Check glucose — hypoglycemia mimics stroke",
      "NPO status, head of bed 30°, seizure precautions",
      "tPA evaluation if within therapeutic window",
    ],
    guideline: "AHA/ASA 2019 Guidelines for Early Management",
  },
  respiratory: {
    title: "Respiratory Failure / ARDS",
    icon: Wind,
    description: "Acute hypoxemic or hypercapnic respiratory failure",
    criteria: [
      "SpO2 < 90% on room air (critical if < 85%)",
      "Respiratory rate > 30 breaths/min",
      "Use of accessory muscles, nasal flaring",
      "ARDS Berlin criteria: P/F ratio classification",
    ],
    actions: [
      "Supplemental O2 — target SpO2 92-96%",
      "ABG analysis for pH, PaCO2, PaO2",
      "High-flow nasal cannula or BiPAP trial",
      "Chest X-ray to evaluate infiltrates",
      "Intubation preparedness if failing non-invasive",
    ],
    guideline: "ARDS Network / Berlin Definition Criteria",
  },
  hemorrhage: {
    title: "Major Hemorrhage",
    icon: Droplets,
    description: "Active bleeding with hemodynamic instability or significant blood loss",
    criteria: [
      "Shock Index (HR/SBP) > 1.0",
      "Estimated blood loss > 30% total volume",
      "Hemoglobin drop > 2 g/dL from baseline",
      "Active hemorrhage not controlled by direct pressure",
    ],
    actions: [
      "Activate Massive Transfusion Protocol (MTP)",
      "1:1:1 ratio pRBC:FFP:Platelets",
      "Type and crossmatch STAT",
      "Surgical consult for source control",
      "Permissive hypotension — target SBP 80-90 mmHg",
    ],
    guideline: "EAST 2020 Hemorrhage Management Guidelines",
  },
};

const SEARCH_KEYWORDS: Record<string, string> = {
  "chest pain": "chest_pain",
  "heart attack": "chest_pain",
  "mi": "chest_pain",
  "acs": "chest_pain",
  "angina": "chest_pain",
  "sepsis": "sepsis",
  "infection": "sepsis",
  "fever": "sepsis",
  "qsofa": "sepsis",
  "sirs": "sepsis",
  "stroke": "stroke",
  "paralysis": "stroke",
  "facial droop": "stroke",
  "aphasia": "stroke",
  "breathing": "respiratory",
  "hypoxia": "respiratory",
  "respiratory": "respiratory",
  "spo2": "respiratory",
  "ards": "respiratory",
  "bleeding": "hemorrhage",
  "hemorrhage": "hemorrhage",
  "blood loss": "hemorrhage",
};

export default function ClinicalAssistant() {
  const [query, setQuery] = useState("");
  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null);

  const matchedKey = Object.entries(SEARCH_KEYWORDS).find(
    ([keyword]) => query.toLowerCase().includes(keyword)
  )?.[1] || null;

  const activeProtocol = selectedProtocol || matchedKey;
  const protocol = activeProtocol ? CLINICAL_KNOWLEDGE[activeProtocol] : null;

  return (
    <div className="section">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-3.5 h-3.5 text-violet-600" />
        <span className="section-title">Clinical Assistant</span>
        <span className="text-[9px] text-gray-400">(Rule-Based)</span>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedProtocol(null); }}
          placeholder="Search symptoms or conditions..."
          className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-violet-400 transition"
        />
      </div>

      {/* Quick access tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(CLINICAL_KNOWLEDGE).map(([key, info]) => {
          const Icon = info.icon;
          const isActive = activeProtocol === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedProtocol(key === selectedProtocol ? null : key)}
              className={`
                flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-all
                ${isActive
                  ? "bg-violet-50 border-violet-200 text-violet-700"
                  : "bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              <Icon className="w-3 h-3" />
              {info.title.split("/")[0].split("(")[0].trim()}
            </button>
          );
        })}
      </div>

      {/* Protocol detail */}
      {protocol ? (
        <div className="space-y-3 animate-in fade-in-0 duration-200">
          <div>
            <h4 className="text-xs font-bold text-gray-900 mb-0.5">{protocol.title}</h4>
            <p className="text-[10px] text-gray-500">{protocol.description}</p>
          </div>

          <div>
            <h5 className="text-[10px] font-semibold text-cyan-600 uppercase tracking-wider mb-1">Diagnostic Criteria</h5>
            <ul className="space-y-0.5">
              {protocol.criteria.map((c, i) => (
                <li key={i} className="text-[10px] text-gray-500 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[6px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-cyan-200">
                  {c}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">Clinical Actions</h5>
            <ol className="space-y-0.5">
              {protocol.actions.map((a, i) => (
                <li key={i} className="text-[10px] text-gray-500 pl-3 flex gap-1.5">
                  <span className="text-emerald-600 font-mono flex-shrink-0">{i + 1}.</span>
                  {a}
                </li>
              ))}
            </ol>
          </div>

          <div className="pt-2 border-t border-gray-200 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span className="text-[9px] text-gray-400 italic">{protocol.guideline}</span>
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-gray-400 text-center py-3">
          Type a symptom or select a protocol above
        </p>
      )}
    </div>
  );
}
