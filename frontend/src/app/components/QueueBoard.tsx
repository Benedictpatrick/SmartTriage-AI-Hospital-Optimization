"use client";

import { QueueEntry } from "../lib/api";
import { Users, Clock } from "lucide-react";

interface Props {
  queue: QueueEntry[];
  processedCount: number;
  totalPatients: number;
}

const riskColors: Record<string, string> = {
  Low: "text-green-700 bg-green-50 border-green-200",
  Medium: "text-yellow-700 bg-yellow-50 border-yellow-200",
  High: "text-orange-700 bg-orange-50 border-orange-200",
  Critical: "text-red-700 bg-red-50 border-red-200",
};

export default function QueueBoard({ queue, processedCount, totalPatients }: Props) {
  return (
    <div className="card">
      <div className="card-header flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-blue-600" />
          <span>Triage Queue</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-400 normal-case tracking-normal">
          <span>W:<span className="text-gray-900 font-semibold ml-0.5">{queue.length}</span></span>
          <span>P:<span className="text-green-600 font-semibold ml-0.5">{processedCount}</span></span>
          <span>T:<span className="text-gray-700 ml-0.5">{totalPatients}</span></span>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-8">
          Queue is empty
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
          {queue.slice(0, 20).map((entry) => (
            <div
              key={entry.patient_id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all duration-300 ${
                riskColors[entry.risk_level] || "bg-gray-100 border-gray-200"
              } ${entry.risk_level === "Critical" ? "animate-pulse-critical" : ""}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono text-gray-400 w-6">#{entry.position}</span>
                <div className="min-w-0">
                  <span className="font-medium text-gray-900 truncate block">
                    {entry.patient_name || entry.patient_id}
                  </span>
                  <span className="text-xs text-gray-500">
                    Age {entry.age} · {entry.department}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`badge border ${riskColors[entry.risk_level]}`}>
                  {entry.risk_level}
                </span>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {entry.wait_time_seconds > 0 ? `${Math.round(entry.wait_time_seconds)}s` : "—"}
                </div>
              </div>
            </div>
          ))}
          {queue.length > 20 && (
            <div className="text-center text-xs text-gray-400 pt-1">
              +{queue.length - 20} more patients
            </div>
          )}
        </div>
      )}
    </div>
  );
}
