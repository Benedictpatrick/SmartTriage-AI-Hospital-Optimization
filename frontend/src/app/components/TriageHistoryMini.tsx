"use client";

import { TriageResult } from "../lib/api";
import { AlertCircle, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface Props {
  history: TriageResult[];
}

const riskColors: Record<string, string> = {
  Low: "#22c55e",
  Medium: "#eab308",
  High: "#f97316",
  Critical: "#ef4444",
};

const riskIcons: Record<string, React.ReactNode> = {
  Low: <CheckCircle className="w-3 h-3 text-green-600" />,
  Medium: <AlertTriangle className="w-3 h-3 text-yellow-600" />,
  High: <AlertCircle className="w-3 h-3 text-orange-600" />,
  Critical: <XCircle className="w-3 h-3 text-red-600" />,
};

export default function TriageHistoryMini({ history }: Props) {
  if (history.length === 0) {
    return (
      <div className="card">
        <div className="card-header">Recent Triages</div>
        <div className="text-sm text-gray-400 py-4 text-center">No history yet</div>
      </div>
    );
  }

  // Mini sparkline of recent risk scores
  const scores = history.slice(-20).map((h) => h.risk_score);
  const sparkW = 120;
  const sparkH = 24;
  const maxS = Math.max(...scores, 0.01);
  const points = scores
    .map((s, i) => {
      const x = (i / Math.max(scores.length - 1, 1)) * sparkW;
      const y = sparkH - (s / maxS) * sparkH;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span>Recent Triages</span>
        <svg width={sparkW} height={sparkH} className="opacity-60">
          <polyline fill="none" stroke="#06b6d4" strokeWidth={1.5} points={points} />
        </svg>
      </div>

      <div className="mt-2 space-y-0.5 max-h-[200px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
        {[...history].reverse().slice(0, 10).map((h, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors text-xs"
          >
            {riskIcons[h.risk_level]}
            <span className="font-mono text-gray-500 w-16 truncate">{h.patient_id}</span>
            <div
              className="h-1.5 rounded-full flex-1"
              style={{ background: "#E5E7EB" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(h.risk_score * 100)}%`,
                  background: riskColors[h.risk_level],
                }}
              />
            </div>
            <span className="font-mono text-gray-400 w-8 text-right">{Math.round(h.risk_score * 100)}%</span>
            <span className="text-gray-400 w-12 text-right truncate">{h.department.slice(0, 5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
