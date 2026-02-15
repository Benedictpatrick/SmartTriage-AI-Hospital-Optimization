"use client";

import { TriageResult } from "../lib/api";
import { AlertTriangle, CheckCircle, AlertCircle, XCircle, Eye, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface Props {
  result: TriageResult | null;
  previousScore?: number | null;
}

const riskConfig = {
  Low:      { color: "#22c55e", bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.25)", Icon: CheckCircle,   label: "LOW" },
  Medium:   { color: "#eab308", bg: "rgba(234,179,8,0.10)", border: "rgba(234,179,8,0.25)", Icon: AlertTriangle, label: "MED" },
  High:     { color: "#f97316", bg: "rgba(249,115,22,0.10)",border: "rgba(249,115,22,0.25)",Icon: AlertCircle,   label: "HIGH" },
  Critical: { color: "#ef4444", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.25)", Icon: XCircle,       label: "CRIT" },
};

/* Risk band arcs for the outer ring */
const BANDS = [
  { label: "Low",    color: "#22c55e", start: 0,    end: 0.25 },
  { label: "Medium", color: "#eab308", start: 0.25, end: 0.50 },
  { label: "High",   color: "#f97316", start: 0.50, end: 0.75 },
  { label: "Critical",color:"#ef4444", start: 0.75, end: 1.0  },
];

function ArcPath({ cx, cy, r, startFrac, endFrac, color, width, opacity }: {
  cx: number; cy: number; r: number; startFrac: number; endFrac: number;
  color: string; width: number; opacity: number;
}) {
  const startAngle = -90 + startFrac * 360;
  const endAngle = -90 + endFrac * 360;
  const largeArc = (endFrac - startFrac) > 0.5 ? 1 : 0;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" opacity={opacity} />;
}

export default function RiskGauge({ result, previousScore }: Props) {
  if (!result) {
    return (
      <div className="card flex flex-col items-center justify-center min-h-[280px] text-gray-400">
        <Eye className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">Submit a patient to see risk assessment</p>
      </div>
    );
  }

  const cfg = riskConfig[result.risk_level];
  const Icon = cfg.Icon;
  const percentage = Math.round(result.risk_score * 100);
  const confidencePct = Math.round(result.confidence * 100);

  // Trend arrow
  const trend = previousScore != null
    ? result.risk_score > previousScore + 0.02 ? "up"
    : result.risk_score < previousScore - 0.02 ? "down" : "stable"
    : null;

  // Ring radii
  const CX = 100, CY = 100;
  const outerR = 88;
  const midR = 72;
  const confidenceCirc = 2 * Math.PI * midR;
  const confidenceOffset = confidenceCirc - (result.confidence * confidenceCirc);

  return (
    <div className="card" style={{ borderColor: cfg.border }}>
      <div className="card-header flex items-center justify-between mb-2">
        <span>Risk Assessment</span>
        <span className="text-[10px] text-gray-400 normal-case tracking-normal">{result.patient_id}</span>
      </div>

      {/* Multi-ring gauge */}
      <div className="flex justify-center my-2">
        <div className="relative" style={{ width: 200, height: 200 }}>
          <svg width="200" height="200">
            {/* Outer ring: 4 risk band arcs */}
            {BANDS.map((b) => {
              const isActive = result.risk_score >= b.start;
              return (
                <ArcPath
                  key={b.label}
                  cx={CX} cy={CY} r={outerR}
                  startFrac={b.start} endFrac={b.end}
                  color={b.color} width={8}
                  opacity={isActive ? 1 : 0.15}
                />
              );
            })}

            {/* Score needle tick */}
            {(() => {
              const angle = -90 + result.risk_score * 360;
              const toRad = (d: number) => (d * Math.PI) / 180;
              const x = CX + (outerR + 6) * Math.cos(toRad(angle));
              const y = CY + (outerR + 6) * Math.sin(toRad(angle));
              return <circle cx={x} cy={y} r={3} fill={cfg.color} />;
            })()}

            {/* Middle ring: confidence track */}
            <circle cx={CX} cy={CY} r={midR} fill="none" stroke="#E5E7EB" strokeWidth={6} />
            <circle
              cx={CX} cy={CY} r={midR} fill="none"
              stroke="#06b6d4" strokeWidth={6} strokeLinecap="round"
              strokeDasharray={confidenceCirc} strokeDashoffset={confidenceOffset}
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <span className="text-3xl font-bold tabular-nums" style={{ color: cfg.color }}>{percentage}</span>
              <span className="text-sm text-gray-400">%</span>
              {trend === "up" && <ArrowUpRight className="w-4 h-4 text-red-400" />}
              {trend === "down" && <ArrowDownRight className="w-4 h-4 text-green-400" />}
              {trend === "stable" && <Minus className="w-3 h-3 text-gray-400" />}
            </div>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Risk Score</span>
            <span className="text-[10px] text-blue-500 mt-0.5">{confidencePct}% conf</span>
          </div>
        </div>
      </div>

      {/* Risk Level Badge */}
      <div className="flex justify-center mb-3">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider ${
            result.risk_level === "Critical" ? "animate-pulse" : ""
          }`}
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
        >
          <Icon className="w-3.5 h-3.5" />
          {cfg.label} RISK
        </div>
      </div>

      {/* 2x3 detail grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="metric-label">ML Prob</div>
          <div className="text-gray-900 font-bold text-sm tabular-nums">{(result.ml_probability * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="metric-label">Clinical</div>
          <div className="text-gray-900 font-bold text-sm tabular-nums">{(result.clinical_rule_score * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="metric-label">Dept</div>
          <div className="text-blue-600 font-bold text-[11px] truncate">{result.department}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="metric-label">Confidence</div>
          <div className="font-bold text-sm tabular-nums" style={{ color: result.confidence < 0.6 ? "#ca8a04" : "#16a34a" }}>
            {confidencePct}%
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="metric-label">Review</div>
          <div className={`font-bold text-sm ${result.needs_manual_review ? "text-yellow-600" : "text-green-600"}`}>
            {result.needs_manual_review ? "YES" : "NO"}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="metric-label">Vitals Idx</div>
          <div className="text-gray-900 font-bold text-sm">{result.vital_abnormality_index?.toFixed(1) ?? "—"}</div>
        </div>
      </div>

      {/* Alerts */}
      {result.needs_manual_review && (
        <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
          <span className="text-yellow-700 text-[11px] font-medium">Low confidence — manual review required</span>
        </div>
      )}
      {result.department_fallback && (
        <div className="mt-1.5 bg-blue-50 border border-blue-200 rounded-lg p-2 text-[11px] text-blue-700">
          ↳ Fallback dept: {result.department_fallback}
        </div>
      )}
    </div>
  );
}
