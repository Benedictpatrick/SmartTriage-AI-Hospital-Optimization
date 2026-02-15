"use client";

import { useState } from "react";
import DigitalTwin from "./DigitalTwin";
import ImpactMetricsPanel from "./ImpactMetrics";
import EventLog from "./EventLog";
import { Building2, BarChart3 } from "lucide-react";

type SimTab = "twin" | "metrics";

export default function SimulationView() {
  const [subTab, setSubTab] = useState<SimTab>("twin");

  return (
    <div className="space-y-3">
      {/* Sub-tab selector */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 w-fit border border-gray-200">
        {([
          { id: "twin" as SimTab, label: "Digital Twin", Icon: Building2 },
          { id: "metrics" as SimTab, label: "Impact Metrics", Icon: BarChart3 },
        ]).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              subTab === id
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {subTab === "twin" && <DigitalTwin />}

      {subTab === "metrics" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <ImpactMetricsPanel />
          </div>
          <EventLog />
        </div>
      )}
    </div>
  );
}
