"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, AlertTriangle, HelpCircle, Server, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { runEdgeCaseDemo, EdgeCaseResults } from "../lib/api";

const SCENARIOS = [
  {
    key: "missing_vitals",
    label: "Missing Vitals",
    desc: "72M — all vitals null",
    icon: AlertTriangle,
    color: "#eab308",
  },
  {
    key: "low_confidence",
    label: "Low Confidence",
    desc: "40F — vague symptoms",
    icon: HelpCircle,
    color: "#8b5cf6",
  },
  {
    key: "overloaded_dept",
    label: "Overloaded Dept",
    desc: "65M cardiac + full Cardiology",
    icon: Server,
    color: "#ef4444",
  },
];

const riskIcons: Record<string, React.ReactNode> = {
  Low: <CheckCircle className="w-3.5 h-3.5 text-green-600" />,
  Medium: <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />,
  High: <AlertCircle className="w-3.5 h-3.5 text-orange-600" />,
  Critical: <XCircle className="w-3.5 h-3.5 text-red-600" />,
};

export default function EdgeCaseDemo() {
  const [results, setResults] = useState<EdgeCaseResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleRun = async () => {
    setLoading(true);
    try {
      const data = await runEdgeCaseDemo();
      setResults(data);
    } catch {
      // noop
    }
    setLoading(false);
  };

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span>Edge Case Demo</span>
        <button
          onClick={handleRun}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          {loading ? "Running" : "Run All"}
        </button>
      </div>

      <div className="space-y-2 mt-2">
        {SCENARIOS.map((sc) => {
          const result = (results?.edge_cases as any)?.[sc.key];
          const isOpen = expanded === sc.key;

          return (
            <div key={sc.key}>
              <button
                onClick={() => setExpanded(isOpen ? null : sc.key)}
                className="w-full text-left flex items-center gap-2.5 p-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <sc.icon className="w-4 h-4 shrink-0" style={{ color: sc.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900">{sc.label}</div>
                  <div className="text-[10px] text-gray-400">{sc.desc}</div>
                </div>
                {result && riskIcons[result.risk_level]}
                {result && (
                  <span className="text-[10px] font-mono text-gray-500">
                    {(result.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isOpen && result && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-6 mt-1 p-2 rounded-md bg-gray-50 border border-gray-200 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Risk</span>
                        <span className="text-gray-900 font-semibold">{result.risk_level} ({(result.risk_score * 100).toFixed(0)}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Confidence</span>
                        <span className={result.confidence < 0.6 ? "text-yellow-600" : "text-green-600"}>
                          {(result.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Department</span>
                        <span className="text-blue-600">{result.department}</span>
                      </div>
                      {result.needs_manual_review && (
                        <div className="flex items-center gap-1 text-yellow-600 mt-1">
                          <AlertTriangle className="w-3 h-3" />
                          Manual review required
                        </div>
                      )}
                      {result.department_fallback && (
                        <div className="text-blue-600">
                          ↳ Fallback: {result.department_fallback}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
