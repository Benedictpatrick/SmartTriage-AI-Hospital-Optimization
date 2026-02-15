"use client";

import { useState, useCallback } from "react";
import {
  SlidersHorizontal, Users, Clock, Activity, AlertTriangle,
  Zap, RotateCcw, Play,
} from "lucide-react";
import { motion } from "framer-motion";

/* ── Types ─────────────────────────────────────────────── */

export interface WhatIfParams {
  arrivalRate: number;      // 0.5 - 5.0 patients/min
  capacity: number;         // 50 - 200 % of normal
  serviceTime: number;      // 0.5 - 3.0x multiplier
  criticalRatio: number;    // 0 - 50 % of arrivals
  aiEnabled: boolean;
}

interface Props {
  onParamsChange: (p: WhatIfParams) => void;
  activeParams: WhatIfParams;
}

const DEFAULT_PARAMS: WhatIfParams = {
  arrivalRate: 1.0,
  capacity: 100,
  serviceTime: 1.0,
  criticalRatio: 10,
  aiEnabled: true,
};

/* ── Helpers ──────────────────────────────────────────── */

function SliderRow({
  label, icon: Icon, value, min, max, step, unit, color, onChange,
}: {
  label: string; icon: React.ElementType; value: number;
  min: number; max: number; step: number; unit: string;
  color: string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3 h-3 ${color}`} />
          <span className="text-[9px] font-semibold text-gray-600 uppercase tracking-wide">{label}</span>
        </div>
        <span className="text-[10px] font-mono font-bold text-gray-800">{value}{unit}</span>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="absolute inset-x-0 h-1 bg-gray-200 rounded-full" />
        <div className="absolute left-0 h-1 rounded-full bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-sm transition-transform hover:scale-110"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between text-[7px] text-gray-400 font-mono">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

/* ── Component ─────────────────────────────────────────── */

export default function WhatIfControls({ onParamsChange, activeParams }: Props) {
  const [params, setParams] = useState<WhatIfParams>(activeParams);
  const [isLive, setIsLive] = useState(false);

  const set = useCallback((key: keyof WhatIfParams, value: number | boolean) => {
    setParams(prev => {
      const next = { ...prev, [key]: value };
      if (isLive) onParamsChange(next);
      return next;
    });
  }, [isLive, onParamsChange]);

  const reset = () => {
    setParams(DEFAULT_PARAMS);
    onParamsChange(DEFAULT_PARAMS);
  };

  const apply = () => onParamsChange(params);

  // Stress level indicator
  const stress = Math.min(100, Math.round(
    (params.arrivalRate / 5) * 25 +
    ((200 - params.capacity) / 150) * 25 +
    (params.serviceTime / 3) * 25 +
    (params.criticalRatio / 50) * 25
  ));
  const stressColor = stress > 70 ? "text-red-600" : stress > 40 ? "text-amber-600" : "text-green-600";
  const stressLabel = stress > 70 ? "Extreme" : stress > 40 ? "Moderate" : "Normal";

  return (
    <div className="section">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            What-If Scenario
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1 px-2 py-0.5 text-[8px] font-bold rounded transition ${
              isLive
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-gray-100 text-gray-500 border border-gray-200"
            }`}
          >
            <Zap className="w-2.5 h-2.5" />
            {isLive ? "Live" : "Manual"}
          </button>
          <button onClick={reset} className="p-1 text-gray-400 hover:text-gray-600 transition">
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Stress indicator */}
      <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1">
            <Activity className="w-3 h-3 text-gray-400" />
            <span className="text-[8px] font-semibold text-gray-500 uppercase">System Stress</span>
          </div>
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${stress > 70 ? "bg-red-500" : stress > 40 ? "bg-amber-500" : "bg-green-500"}`}
              animate={{ width: `${stress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
        <div className="text-right">
          <div className={`text-base font-black font-mono ${stressColor}`}>{stress}%</div>
          <div className={`text-[7px] font-bold uppercase ${stressColor}`}>{stressLabel}</div>
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-3">
        <SliderRow
          label="Arrival Rate" icon={Users}
          value={params.arrivalRate} min={0.5} max={5.0} step={0.1}
          unit="/min" color="text-blue-500" onChange={v => set("arrivalRate", v)}
        />
        <SliderRow
          label="Capacity" icon={Activity}
          value={params.capacity} min={50} max={200} step={5}
          unit="%" color="text-purple-500" onChange={v => set("capacity", v)}
        />
        <SliderRow
          label="Service Time" icon={Clock}
          value={params.serviceTime} min={0.5} max={3.0} step={0.1}
          unit="×" color="text-cyan-500" onChange={v => set("serviceTime", v)}
        />
        <SliderRow
          label="Critical Ratio" icon={AlertTriangle}
          value={params.criticalRatio} min={0} max={50} step={1}
          unit="%" color="text-red-500" onChange={v => set("criticalRatio", v)}
        />
      </div>

      {/* Apply button (non-live mode) */}
      {!isLive && (
        <button
          onClick={apply}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wide rounded-lg transition shadow-sm"
        >
          <Play className="w-3 h-3" />
          Apply Scenario
        </button>
      )}
    </div>
  );
}
