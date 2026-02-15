"use client";

import { Heart, Wind, Thermometer, Activity, Droplets } from "lucide-react";

interface Props {
  vitals: {
    heart_rate?: number | null;
    systolic_bp?: number | null;
    diastolic_bp?: number | null;
    spo2?: number | null;
    temperature?: number | null;
    respiratory_rate?: number | null;
  };
}

type VitalStatus = "normal" | "elevated" | "critical" | "low" | "unknown";

function classify(name: string, value: number | null | undefined): { status: VitalStatus; label: string; display: string } {
  if (value == null) return { status: "unknown", label: name, display: "—" };

  switch (name) {
    case "HR": {
      const s = value < 50 ? "low" : value <= 100 ? "normal" : value <= 120 ? "elevated" : "critical";
      return { status: s as VitalStatus, label: "HR", display: `${value} bpm` };
    }
    case "BP": {
      const s = value < 90 ? "low" : value <= 120 ? "normal" : value <= 140 ? "elevated" : "critical";
      return { status: s as VitalStatus, label: "BP", display: `${value}` };
    }
    case "SpO₂": {
      const s = value >= 95 ? "normal" : value >= 90 ? "elevated" : "critical";
      return { status: s as VitalStatus, label: "SpO₂", display: `${value}%` };
    }
    case "Temp": {
      const s = value < 36 ? "low" : value <= 37.5 ? "normal" : value <= 38.5 ? "elevated" : "critical";
      return { status: s as VitalStatus, label: "Temp", display: `${value}°C` };
    }
    case "RR": {
      const s = value < 10 ? "low" : value <= 20 ? "normal" : value <= 28 ? "elevated" : "critical";
      return { status: s as VitalStatus, label: "RR", display: `${value}/min` };
    }
    default:
      return { status: "unknown", label: name, display: `${value}` };
  }
}

const statusClass: Record<VitalStatus, string> = {
  normal: "vital-normal",
  elevated: "vital-elevated",
  critical: "vital-critical",
  low: "vital-low",
  unknown: "bg-gray-100 text-gray-400 border border-gray-200",
};

const icons: Record<string, React.ReactNode> = {
  HR:   <Heart className="w-3 h-3" />,
  BP:   <Activity className="w-3 h-3" />,
  "SpO₂": <Droplets className="w-3 h-3" />,
  Temp: <Thermometer className="w-3 h-3" />,
  RR:   <Wind className="w-3 h-3" />,
};

export default function VitalTags({ vitals }: Props) {
  const items = [
    classify("HR", vitals.heart_rate),
    classify("BP", vitals.systolic_bp),
    classify("SpO₂", vitals.spo2),
    classify("Temp", vitals.temperature),
    classify("RR", vitals.respiratory_rate),
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((v) => (
        <span
          key={v.label}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${statusClass[v.status]}`}
        >
          {icons[v.label]}
          <span className="uppercase">{v.label}</span>
          <span className="font-mono">{v.display}</span>
        </span>
      ))}
    </div>
  );
}
