"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, XCircle, X } from "lucide-react";

interface Props {
  riskLevel: "High" | "Critical" | null;
  patientId?: string;
  department?: string;
  onDismiss: () => void;
}

export default function AlertBanner({ riskLevel, patientId, department, onDismiss }: Props) {
  if (!riskLevel) return null;

  const isCritical = riskLevel === "Critical";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`overflow-hidden rounded-lg mb-3 ${
          isCritical
            ? "bg-red-50 border border-red-200"
            : "bg-orange-50 border border-orange-200"
        }`}
        style={{
          animation: isCritical ? "glow-red 2s infinite" : "glow-amber 3s infinite",
        }}
      >
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isCritical ? (
              <XCircle className="w-5 h-5 text-red-600 animate-pulse" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            )}
            <div>
              <div className={`text-sm font-bold tracking-wide ${
                isCritical ? "text-red-700" : "text-orange-700"
              }`}>
                {isCritical
                  ? "CRITICAL TRIAGE PRIORITY — IMMEDIATE ATTENTION REQUIRED"
                  : "HIGH RISK PATIENT — PRIORITY PROCESSING"}
              </div>
              {patientId && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {patientId} → {department}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
