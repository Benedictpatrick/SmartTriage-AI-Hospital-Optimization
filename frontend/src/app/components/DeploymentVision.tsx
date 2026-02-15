"use client";

import { Cloud, Server, Users, Shield, Lock, Globe, Monitor, Database, Cpu, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DEPLOY_LAYERS = [
  {
    icon: Cloud,
    title: "Cloud Infrastructure",
    items: ["AWS HIPAA-eligible services (EC2, RDS, S3)", "Auto-scaling group for API tier", "Multi-AZ deployment for 99.9% uptime"],
    color: "#06b6d4",
  },
  {
    icon: Lock,
    title: "Security & Compliance",
    items: ["HIPAA BAA with cloud provider", "AES-256 encryption at rest + TLS 1.3 in transit", "PHI audit logging with CloudTrail"],
    color: "#8b5cf6",
  },
  {
    icon: Database,
    title: "Data Architecture",
    items: ["PostgreSQL (HIPAA) for patient records", "Redis cache for real-time queue state", "FHIR R4 API for EHR interoperability"],
    color: "#22c55e",
  },
  {
    icon: Globe,
    title: "Integration Points",
    items: ["HL7 FHIR R4 patient intake", "Epic/Cerner EHR bidirectional sync", "PACS integration for imaging workflows"],
    color: "#eab308",
  },
];

const ROLES = [
  { id: "triage_nurse", label: "Triage Nurse", desc: "Patient intake, risk assessment, protocol guidance", icon: Shield, color: "#06b6d4" },
  { id: "ed_physician", label: "ED Physician", desc: "Full clinical view, SHAP explanations, override controls", icon: Cpu, color: "#22c55e" },
  { id: "charge_nurse", label: "Charge Nurse", desc: "Department loads, queue management, capacity planning", icon: Users, color: "#eab308" },
  { id: "admin", label: "Admin/CMO", desc: "Impact metrics, fairness analytics, system performance", icon: Monitor, color: "#8b5cf6" },
];

export default function DeploymentVision() {
  const [showDeploy, setShowDeploy] = useState(true);

  return (
    <div className="space-y-4">
      {/* Deployment Architecture */}
      <div className="section">
        <button
          onClick={() => setShowDeploy(!showDeploy)}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-blue-600" />
            <span className="section-title">Deployment Vision</span>
          </div>
          {showDeploy ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        </button>

        <AnimatePresence>
          {showDeploy && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden space-y-3"
            >
              {DEPLOY_LAYERS.map(({ icon: Icon, title, items, color }) => (
                <div key={title} className="pl-3 border-l-2" style={{ borderColor: `${color}30` }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3 h-3" style={{ color }} />
                    <span className="text-[11px] font-semibold text-gray-900">{title}</span>
                  </div>
                  {items.map((item, i) => (
                    <p key={i} className="text-[10px] text-gray-500 pl-4 leading-relaxed">{item}</p>
                  ))}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Role-Based Access */}
      <div className="section">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-3.5 h-3.5 text-emerald-600" />
          <span className="section-title">Role-Based Views</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {ROLES.map(({ id, label, desc, icon: Icon, color }) => (
            <div
              key={id}
              className="px-3 py-2 rounded-md border border-gray-200 bg-gray-50 hover:border-gray-300 transition-all"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" style={{ color }} />
                <span className="text-[11px] font-semibold text-gray-900">{label}</span>
              </div>
              <p className="text-[9px] text-gray-400 leading-snug">{desc}</p>
            </div>
          ))}
        </div>

        <p className="text-[9px] text-gray-400 text-center mt-2 italic">
          Production deployment would filter dashboard by authenticated role
        </p>
      </div>
    </div>
  );
}
