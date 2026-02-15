"use client";

import { Zap } from "lucide-react";

// Scenario definitions matching the backend
const SCENARIOS = {
  normal: {
    label: "Normal Ops",
    description: "Standard ER flow — 50 patients, normal arrival rate",
    color: "#22c55e",
    patients: 50,
  },
  surge: {
    label: "Mass Casualty",
    description: "120 patients, 4× arrival rate — MCI simulation",
    color: "#ef4444",
    patients: 120,
  },
  flu_outbreak: {
    label: "Flu Outbreak",
    description: "100 patients, 2.7× arrivals — mostly medium severity",
    color: "#eab308",
    patients: 100,
  },
  cardiac_surge: {
    label: "Cardiac Surge",
    description: "80 high-acuity cardiac patients clustered",
    color: "#f97316",
    patients: 80,
  },
  digital_twin: {
    label: "Digital Twin",
    description: "100 patients — full hospital simulation, AI vs FIFO comparison",
    color: "#06b6d4",
    patients: 100,
  },
  disaster: {
    label: "Mass Disaster",
    description: "200 patients, 8× arrival rate — 60% critical, extreme stress test",
    color: "#dc2626",
    patients: 200,
  },
};

interface Props {
  onSelectScenario: (scenario: string) => void;
  currentScenario: string;
  isRunning: boolean;
}

export default function StressTestControls({ onSelectScenario, currentScenario, isRunning }: Props) {
  return (
    <div className="section">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-3.5 h-3.5 text-amber-600" />
        <span className="section-title">Stress Test Scenario</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {Object.entries(SCENARIOS).map(([key, cfg]) => {
          const isActive = currentScenario === key;
          return (
            <button
              key={key}
              onClick={() => !isRunning && onSelectScenario(key)}
              disabled={isRunning}
              title={cfg.description}
              className={`
                text-left px-2.5 py-2 rounded border transition-all text-xs
                ${isActive
                  ? "border-blue-200 bg-blue-50"
                  : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100"
                }
                ${isRunning ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: cfg.color,
                    boxShadow: isActive ? `0 0 6px ${cfg.color}40` : undefined,
                  }}
                />
                <span className="font-semibold text-gray-900 text-[10px]">{cfg.label}</span>
              </div>
              <p className="text-[9px] text-gray-400 pl-3 leading-snug">{cfg.patients} patients</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
