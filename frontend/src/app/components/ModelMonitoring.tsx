"use client";

import { useEffect, useState } from "react";
import { MonitoringData, getModelMonitoring } from "../lib/api";
import {
  Activity, AlertTriangle, CheckCircle, Eye,
  BarChart3, Target, TrendingUp,
} from "lucide-react";

const RISK_LABELS = ["Low", "Medium", "High", "Critical"];
const RISK_COLORS: Record<string, string> = {
  Low: "text-green-600", Medium: "text-yellow-600",
  High: "text-orange-600", Critical: "text-red-600",
};

const DRIFT_STYLES: Record<string, { color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  Normal: { color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle },
  Watch: { color: "text-amber-600", bg: "bg-amber-50", icon: Eye },
  Alert: { color: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
};

export default function ModelMonitoring() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getModelMonitoring()
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="section text-red-600 text-[11px]">{error}</div>;
  if (!data) return <div className="section text-gray-400 text-[11px] text-center py-6">Loading model monitoring...</div>;

  const drift = data.drift;
  const driftStyle = DRIFT_STYLES[drift.status] || DRIFT_STYLES.Normal;
  const DriftIcon = driftStyle.icon;

  // Find max confusion matrix value for heat scaling
  const cmFlat = data.confusion_matrix.flat();
  const cmMax = Math.max(...cmFlat, 1);

  return (
    <div className="space-y-3">
      {/* ── Drift Indicator + CV Stats ──────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Drift */}
        <div className="section">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Data Drift Monitor</span>
          </div>
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded ${driftStyle.bg} border border-gray-200`}>
            <DriftIcon className={`w-5 h-5 ${driftStyle.color}`} />
            <div>
              <div className={`text-sm font-bold ${driftStyle.color}`}>
                {drift.status}
              </div>
              <div className="text-[9px] text-gray-400">
                KL Divergence: <span className="font-mono text-gray-900">{drift.kl_divergence.toFixed(4)}</span>
                {" · "}{drift.prediction_count} predictions tracked
              </div>
            </div>
          </div>

          {/* Distribution Comparison */}
          <div className="mt-3 space-y-1.5">
            <div className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Distribution Comparison</div>
            {RISK_LABELS.map(level => {
              const train = (drift.training_distribution[level] || 0) * 100;
              const live = (drift.live_distribution[level] || 0) * 100;
              return (
                <div key={level} className="flex items-center gap-2">
                  <span className={`text-[9px] w-12 ${RISK_COLORS[level]}`}>{level}</span>
                  <div className="flex-1 flex items-center gap-1">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden relative">
                      <div className="h-full bg-gray-400/50 rounded-full" style={{ width: `${train}%` }} />
                      <div className="absolute top-0 left-0 h-full bg-cyan-500/70 rounded-full" style={{ width: `${live}%` }} />
                    </div>
                  </div>
                  <span className="text-[8px] font-mono text-gray-400 w-16 text-right">
                    {train.toFixed(1)}→{live.toFixed(1)}%
                  </span>
                </div>
              );
            })}
            <div className="flex items-center gap-3 mt-1 text-[8px] text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-1 bg-gray-400/50 rounded" /> Training</span>
              <span className="flex items-center gap-1"><span className="w-2 h-1 bg-cyan-500/70 rounded" /> Live</span>
            </div>
          </div>
        </div>

        {/* Cross-Validation Stats */}
        <div className="section">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Model Performance</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "CV Accuracy", val: data.cv_stats.accuracy_mean, std: data.cv_stats.accuracy_std },
              { label: "F1 Macro", val: data.cv_stats.f1_macro_mean },
              { label: "Hybrid Acc", val: data.model_accuracies.hybrid },
            ].map(m => (
              <div key={m.label} className="bg-gray-50 rounded px-2 py-2 text-center border border-gray-100">
                <div className="text-base font-bold text-gray-900 tabular-nums">
                  {(m.val * 100).toFixed(1)}%
                </div>
                {m.std !== undefined && (
                  <div className="text-[8px] text-gray-400 font-mono">±{(m.std * 100).toFixed(2)}%</div>
                )}
                <div className="text-[8px] text-gray-500 uppercase mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Model Comparison */}
          <div className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Model Comparison</div>
          {[
            { label: "Rule-Based", val: data.model_accuracies.rule_based, color: "bg-gray-400" },
            { label: "ML (XGBoost)", val: data.model_accuracies.ml, color: "bg-blue-500" },
            { label: "Hybrid", val: data.model_accuracies.hybrid, color: "bg-emerald-500" },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-2 mb-1">
              <span className="text-[9px] text-gray-500 w-16">{m.label}</span>
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full ${m.color}/70 rounded-full`} style={{ width: `${m.val * 100}%` }} />
              </div>
              <span className="text-[9px] font-mono text-gray-900 w-10 text-right">{(m.val * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Precision / Recall / F1 Table ──────────── */}
      <div className="section">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Per-Class Metrics</span>
        </div>
        <div className="overflow-hidden rounded border border-gray-200">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-1.5 text-[9px] font-bold text-gray-500 uppercase tracking-wider">Risk Level</th>
                <th className="text-center px-3 py-1.5 text-[9px] font-bold text-gray-500 uppercase tracking-wider">Precision</th>
                <th className="text-center px-3 py-1.5 text-[9px] font-bold text-gray-500 uppercase tracking-wider">Recall</th>
                <th className="text-center px-3 py-1.5 text-[9px] font-bold text-gray-500 uppercase tracking-wider">F1 Score</th>
                <th className="text-center px-3 py-1.5 text-[9px] font-bold text-gray-500 uppercase tracking-wider">AUC-ROC</th>
              </tr>
            </thead>
            <tbody>
              {RISK_LABELS.map((level, i) => {
                const m = data.per_class_metrics[level] || {};
                const auc = data.auc_roc[level] || 0;
                const cellColor = (v: number) =>
                  v >= 0.95 ? "text-emerald-600" : v >= 0.8 ? "text-green-600" : v >= 0.7 ? "text-amber-600" : "text-red-600";
                return (
                  <tr key={level} className={i % 2 === 0 ? "bg-gray-50/50" : ""}>
                    <td className={`px-3 py-1.5 font-semibold ${RISK_COLORS[level]}`}>{level}</td>
                    <td className={`text-center px-3 py-1.5 font-mono ${cellColor(m.precision || 0)}`}>{((m.precision || 0) * 100).toFixed(1)}%</td>
                    <td className={`text-center px-3 py-1.5 font-mono ${cellColor(m.recall || 0)}`}>{((m.recall || 0) * 100).toFixed(1)}%</td>
                    <td className={`text-center px-3 py-1.5 font-mono ${cellColor(m.f1 || 0)}`}>{((m.f1 || 0) * 100).toFixed(1)}%</td>
                    <td className={`text-center px-3 py-1.5 font-mono ${cellColor(auc)}`}>{(auc * 100).toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Confusion Matrix ───────────────────────── */}
      <div className="section">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Confusion Matrix</span>
          <span className="text-[8px] text-gray-400 ml-auto">Predicted →</span>
        </div>
        <div className="flex">
          {/* Y-axis label */}
          <div className="flex flex-col justify-center mr-1">
            <span className="text-[8px] text-gray-400 writing-mode-vertical" style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}>
              Actual ↓
            </span>
          </div>
          <div className="flex-1">
            {/* Column headers */}
            <div className="grid grid-cols-4 gap-1 mb-1 pl-14">
              {RISK_LABELS.map(l => (
                <div key={l} className={`text-[8px] text-center font-semibold ${RISK_COLORS[l]}`}>{l.slice(0, 4)}</div>
              ))}
            </div>
            {/* Matrix rows */}
            {data.confusion_matrix.map((row, ri) => (
              <div key={ri} className="flex items-center gap-1 mb-1">
                <div className={`text-[9px] w-14 text-right pr-1 font-semibold ${RISK_COLORS[RISK_LABELS[ri]]}`}>
                  {RISK_LABELS[ri]}
                </div>
                <div className="flex-1 grid grid-cols-4 gap-1">
                  {row.map((val, ci) => {
                    const isDiag = ri === ci;
                    const intensity = val / cmMax;
                    const bg = isDiag
                      ? `rgba(34, 197, 94, ${0.1 + intensity * 0.4})`
                      : val > 0
                        ? `rgba(239, 68, 68, ${0.1 + intensity * 0.4})`
                        : "rgba(0,0,0,0.02)";
                    return (
                      <div
                        key={ci}
                        className="rounded px-1 py-1.5 text-center"
                        style={{ background: bg }}
                      >
                        <span className={`text-[11px] font-bold tabular-nums ${isDiag ? "text-green-700" : val > 0 ? "text-red-700" : "text-gray-300"}`}>
                          {val}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
