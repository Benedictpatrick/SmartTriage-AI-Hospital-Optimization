"use client";

import { DepartmentStatus } from "../lib/api";

interface Props {
  departments: DepartmentStatus[] | Record<string, { current_load: number; capacity: number }>;
}

const DEPT_SHORT: Record<string, string> = {
  "Emergency": "ER",
  "Cardiology": "CARD",
  "Neurology": "NEURO",
  "Orthopedics": "ORTHO",
  "General": "GEN",
  "ICU": "ICU",
  "Pediatrics": "PEDS",
  "Oncology": "ONCO",
};

function occupancyColor(pct: number): string {
  if (pct >= 90) return "heatmap-cell-red";
  if (pct >= 70) return "heatmap-cell-yellow";
  return "heatmap-cell-green";
}

interface DeptEntry {
  name: string;
  current_load: number;
  capacity: number;
}

export default function DeptHeatmap({ departments }: Props) {
  // Normalize to array format
  let entries: DeptEntry[];
  if (Array.isArray(departments)) {
    entries = departments.map(d => ({
      name: d.name,
      current_load: d.current_load,
      capacity: d.capacity,
    }));
  } else {
    entries = Object.entries(departments).map(([name, data]) => ({
      name,
      current_load: data.current_load,
      capacity: data.capacity,
    }));
  }

  if (entries.length === 0) {
    return (
      <div className="card">
        <div className="card-header">Department Load</div>
        <div className="text-sm text-gray-400 py-6 text-center">No department data</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span>Department Load</span>
        <span className="text-[10px] text-gray-400 normal-case tracking-normal">
          {entries.length} depts
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 mt-2">
        {entries.slice(0, 8).map((dept) => {
          const pct = Math.round((dept.current_load / dept.capacity) * 100);
          const short = DEPT_SHORT[dept.name] ?? dept.name.slice(0, 4).toUpperCase();
          const isOverloaded = pct >= 90;

          return (
            <div
              key={dept.name}
              className={`heatmap-cell ${occupancyColor(pct)} relative rounded-md p-2 text-center transition-all ${
                isOverloaded ? "animate-pulse ring-1 ring-red-500/40" : ""
              }`}
              title={`${dept.name}: ${dept.current_load}/${dept.capacity} (${pct}%)`}
            >
              <div className="text-[10px] font-bold text-gray-800 tracking-wider">{short}</div>
              <div className="text-lg font-bold text-gray-900 tabular-nums">{pct}%</div>
              <div className="text-[9px] text-gray-500">{dept.current_load}/{dept.capacity}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
