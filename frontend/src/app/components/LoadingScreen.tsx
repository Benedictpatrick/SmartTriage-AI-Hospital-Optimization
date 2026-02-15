"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

interface Props {
  onComplete: () => void;
}

const PHASES = [
  "Initializing core systems...",
  "Loading ML models...",
  "Connecting hospital network...",
  "Calibrating risk engine...",
  "Systems online.",
];

export default function LoadingScreen({ onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const duration = 2500;
    const interval = 20;
    const step = 100 / (duration / interval);
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, interval);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const thresholds = [0, 20, 45, 70, 95];
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (progress >= thresholds[i]) {
        setPhaseIndex(i);
        break;
      }
    }
  }, [progress]);

  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(onComplete, 600);
      return () => clearTimeout(timeout);
    }
  }, [progress, onComplete]);

  const pct = Math.min(progress, 100);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (pct / 100) * circumference;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: "#FFFFFF" }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >

      <motion.div
        className="flex flex-col items-center gap-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* SVG ring + cross */}
        <div className="relative" style={{ width: 128, height: 128 }}>
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle
              cx="64" cy="64" r={radius}
              fill="none" stroke="#E5E7EB" strokeWidth="4"
            />
            <circle
              cx="64" cy="64" r={radius}
              fill="none" stroke="url(#ringGrad)" strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              transform="rotate(-90 64 64)"
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Plus className="w-10 h-10 text-gray-700" strokeWidth={2.5} />
            </motion.div>
          </div>
        </div>

        {/* Brand text */}
        <motion.div
          className="flex flex-col items-center gap-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">MedBrain</h1>
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-gray-200" />
            <span className="text-[11px] text-gray-400 tracking-widest uppercase">
              by Breakform
            </span>
            <span className="h-px w-8 bg-gray-200" />
          </div>
        </motion.div>

        {/* Progress bar */}
        <motion.div
          className="w-64 flex flex-col items-center gap-3 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <div className="w-full h-[3px] rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, #3b82f6, #06b6d4)",
                transition: "width 0.1s linear",
              }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={phaseIndex}
              className="text-[12px] text-gray-500 text-center h-5"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              {PHASES[phaseIndex]}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Version */}
      <motion.p
        className="absolute bottom-8 text-[11px] text-gray-400 tracking-wide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        v4.0 — Intelligent Hospital Flow Optimization
      </motion.p>
    </motion.div>
  );
}
