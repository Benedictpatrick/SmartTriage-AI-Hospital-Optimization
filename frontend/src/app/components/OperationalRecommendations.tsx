"use client";

import { useEffect, useState } from "react";
import { Recommendation, getRecommendations } from "../lib/api";
import {
  UserPlus, Building, Ambulance, ArrowDownCircle,
  AlertTriangle, CheckCircle, ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  staffing: UserPlus,
  capacity: Building,
  diversion: Ambulance,
  deferral: ArrowDownCircle,
  alert: AlertTriangle,
};

const PRIORITY_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  critical: { bg: "bg-red-50", border: "border-red-200", text: "text-red-600", dot: "bg-red-500" },
  high: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-600", dot: "bg-amber-500" },
  medium: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600", dot: "bg-blue-400" },
  low: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-600", dot: "bg-emerald-500" },
};

interface Props {
  /** If provided, uses these instead of fetching from API (for live sim) */
  liveRecommendations?: Recommendation[];
}

export default function OperationalRecommendations({ liveRecommendations }: Props) {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [error, setError] = useState("");

  // Fetch from API if no live data provided
  useEffect(() => {
    if (liveRecommendations) return;
    getRecommendations()
      .then(r => setRecs(r.recommendations))
      .catch(e => setError(e.message));
  }, [liveRecommendations]);

  const displayRecs = liveRecommendations ?? recs;

  if (error && !liveRecommendations) {
    return null; // Silently fail — this is supplementary
  }

  if (displayRecs.length === 0) return null;

  return (
    <div className="section">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Operational Recommendations
        </span>
        <span className="text-[9px] text-gray-400 font-mono ml-auto">{displayRecs.length}</span>
      </div>

      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {displayRecs.slice(0, 5).map((rec, i) => {
            const style = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.medium;
            const Icon = TYPE_ICONS[rec.type] || AlertTriangle;

            return (
              <motion.div
                key={`${rec.type}-${rec.message.slice(0, 20)}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className={`${style.bg} border ${style.border} rounded px-2.5 py-1.5 group`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${rec.priority === "critical" ? "animate-pulse" : ""}`} />
                    <Icon className={`w-3 h-3 ${style.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[11px] font-medium ${style.text} leading-tight`}>
                      {rec.message}
                    </div>
                    <div className="text-[9px] text-gray-400 mt-0.5 leading-snug hidden group-hover:block">
                      {rec.detail}
                    </div>
                  </div>
                  {rec.metric && (
                    <span className="text-[9px] font-mono text-gray-400 flex-shrink-0 mt-0.5">
                      {rec.metric}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {displayRecs.some(r => r.priority === "low" && r.type === "alert") && (
        <div className="flex items-center gap-1.5 mt-2 px-1">
          <CheckCircle className="w-3 h-3 text-emerald-500" />
          <span className="text-[9px] text-emerald-600">No critical interventions required</span>
        </div>
      )}
    </div>
  );
}
