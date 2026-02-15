"use client";

import { useState, useMemo } from "react";
import {
  FileText, Download, Filter,
  AlertTriangle, ChevronDown, ChevronUp,
  Search, Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Types ─────────────────────────────────────────────── */

export interface AuditEntry {
  id: string;
  timestamp: number;
  patientId: string;
  patientName?: string;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  riskScore: number;
  confidence: number;
  department: string;
  mode: "AI" | "Traditional";
  rationale: string;
  manualReview: boolean;
  responseTimeMs: number;
}

interface Props {
  entries: AuditEntry[];
}

const RISK_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  High: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  Medium: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  Low: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
};

/* ── Component ─────────────────────────────────────────── */

export default function AuditLog({ entries }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = entries;
    if (filter !== "all") result = result.filter(e => e.riskLevel === filter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.patientId.toLowerCase().includes(q) ||
        (e.patientName || "").toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q)
      );
    }
    return result;
  }, [entries, filter, search]);

  const handleExport = () => {
    const csv = [
      "Timestamp,Patient ID,Risk Level,Score,Confidence,Department,Mode,Manual Review,Response Time (ms),Rationale",
      ...entries.map(e =>
        `${new Date(e.timestamp * 1000).toISOString()},${e.patientId},${e.riskLevel},${e.riskScore.toFixed(3)},${(e.confidence * 100).toFixed(1)}%,${e.department},${e.mode},${e.manualReview},${e.responseTimeMs},"${e.rationale}"`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medbrain-audit-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (ts: number) =>
    new Date(ts * 1000).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="section">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Decision Audit Trail
          </span>
          <span className="text-[9px] text-gray-400 font-mono">
            {entries.length} records
          </span>
        </div>
        <button
          onClick={handleExport}
          disabled={entries.length === 0}
          className="flex items-center gap-1 px-2 py-1 text-[9px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition disabled:opacity-40"
        >
          <Download className="w-3 h-3" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patient, department..."
            className="w-full pl-7 pr-2 py-1.5 text-[10px] bg-gray-50 border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-blue-300 text-gray-700 placeholder:text-gray-400"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-gray-400" />
          {["all", "Critical", "High", "Medium", "Low"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-[8px] font-bold uppercase rounded transition ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <div className="text-center py-6">
          <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-[10px] text-gray-400">
            {entries.length === 0 ? "No audit entries — triage patients to generate" : "No matching records"}
          </p>
        </div>
      ) : (
        <div className="space-y-0.5 max-h-64 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {filtered.slice(0, 30).map(e => {
              const style = RISK_STYLE[e.riskLevel] || RISK_STYLE.Low;
              const isExpanded = expanded === e.id;
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  layout
                >
                  <button
                    onClick={() => setExpanded(isExpanded ? null : e.id)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 text-left transition"
                  >
                    <span className="text-[8px] text-gray-400 font-mono w-14 shrink-0">{formatTime(e.timestamp)}</span>
                    <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded border ${style.bg} ${style.text} ${style.border}`}>
                      {e.riskLevel}
                    </span>
                    <span className="text-[9px] text-gray-600 truncate flex-1">{e.patientName || e.patientId.slice(0, 8)}</span>
                    <span className="text-[8px] text-gray-400 truncate w-16">
                      <Building2 className="w-2.5 h-2.5 inline mr-0.5" />
                      {e.department.slice(0, 8)}
                    </span>
                    <span className={`text-[8px] font-bold ${e.mode === "AI" ? "text-blue-600" : "text-gray-500"}`}>
                      {e.mode}
                    </span>
                    <span className="text-[8px] font-mono text-gray-400">{(e.confidence * 100).toFixed(0)}%</span>
                    {e.manualReview && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
                    {isExpanded ? <ChevronUp className="w-3 h-3 text-gray-400 shrink-0" /> : <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />}
                  </button>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-3 py-2 bg-white border-x border-b border-gray-200 rounded-b text-[9px] space-y-1"
                    >
                      <div className="grid grid-cols-3 gap-2">
                        <div><span className="text-gray-400">Score:</span> <span className="font-mono font-bold text-gray-700">{e.riskScore.toFixed(3)}</span></div>
                        <div><span className="text-gray-400">Response:</span> <span className="font-mono font-bold text-gray-700">{e.responseTimeMs}ms</span></div>
                        <div><span className="text-gray-400">Review:</span> <span className={`font-bold ${e.manualReview ? "text-amber-600" : "text-green-600"}`}>{e.manualReview ? "Required" : "No"}</span></div>
                      </div>
                      <div className="pt-1 border-t border-gray-100">
                        <span className="text-gray-400">Rationale: </span>
                        <span className="text-gray-600">{e.rationale}</span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
