"use client";

import { TriageResult } from "../lib/api";
import { BookOpen, FileText, Stethoscope, MapPin, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  result: TriageResult | null;
}

export default function ProtocolPanel({ result }: Props) {
  const [expanded, setExpanded] = useState(true);

  if (!result?.protocol_explanation) {
    return (
      <div className="section">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span className="section-title">Clinical Protocol</span>
        </div>
        <p className="text-xs text-gray-400 py-3 text-center">Submit a patient to see protocol analysis</p>
      </div>
    );
  }

  const proto = result.protocol_explanation;

  const sections = [
    {
      icon: Shield,
      label: "Protocol Basis",
      items: proto.protocol_basis,
      color: "#f97316",
    },
    {
      icon: Stethoscope,
      label: "Vital Interpretation",
      items: proto.vital_interpretation,
      color: "#06b6d4",
    },
    {
      icon: MapPin,
      label: "Department Routing",
      items: [proto.department_reasoning],
      color: "#8b5cf6",
    },
    {
      icon: FileText,
      label: "Risk Justification",
      items: [proto.risk_justification],
      color: "#eab308",
    },
  ];

  return (
    <div className="section">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-2"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span className="section-title">Clinical Protocol</span>
          {proto.guideline_references.length > 0 && (
            <span className="text-[9px] text-blue-500 font-mono">{proto.guideline_references.length} guidelines</span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-3"
          >
            {/* Clinical Summary — one-line human-readable verdict */}
            {result.clinical_summary && (
              <div className="flex items-start gap-2 bg-cyan-50 border border-cyan-200 rounded px-3 py-2">
                <FileText className="w-3.5 h-3.5 text-cyan-600 mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-gray-700 leading-relaxed">
                  {result.clinical_summary}
                </p>
              </div>
            )}

            {/* Clinical rules triggered badges */}
            {result.clinical_rules_triggered.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-gray-200">
                {result.clinical_rules_triggered.map((rule, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-700 text-[10px]">
                    {rule}
                  </span>
                ))}
              </div>
            )}

            {sections.map(({ icon: Icon, label, items, color }) => (
              <div key={label}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3 h-3" style={{ color }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
                </div>
                {items.map((item, i) => (
                  <p key={i} className="text-[11px] text-gray-500 leading-relaxed pl-4 mb-0.5">
                    {item}
                  </p>
                ))}
              </div>
            ))}

            {/* Guideline references */}
            {proto.guideline_references.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider">References</span>
                {proto.guideline_references.map((ref, i) => (
                  <p key={i} className="text-[10px] text-gray-400 italic pl-2">{ref}</p>
                ))}
              </div>
            )}

            {/* Weights breakdown */}
            {Object.keys(result.weights_used).length > 0 && (
              <div className="flex gap-3 pt-2 border-t border-gray-200">
                {Object.entries(result.weights_used).map(([key, val]) => (
                  <div key={key} className="text-center">
                    <div className="text-[13px] font-bold text-gray-900 font-mono">{Math.round(val * 100)}%</div>
                    <div className="text-[9px] text-gray-400 capitalize">{key.replace("_", " ")}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
