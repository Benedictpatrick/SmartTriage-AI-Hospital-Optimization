"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Lock, ChevronDown, Eye, EyeOff, Plus, ArrowRight,
} from "lucide-react";

interface Props {
  onLogin: (role: string) => void;
}

const ROLES = ["Triage Nurse", "Operations Manager", "Admin"];

export default function LoginPage({ onLogin }: Props) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(role);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#fff" }}>
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.025) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Centered card */}
      <motion.div
        className="relative z-10 w-full max-w-[420px] mx-auto px-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg, #2563eb, #0ea5e9)" }}
          >
            <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            {isSignUp ? "Create your account" : "Sign in to MedBrain"}
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">
            {isSignUp ? "Get started with AI-powered triage" : "Hospital flow intelligence platform"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <AnimatePresence mode="wait">
            <motion.form
              key={isSignUp ? "signup" : "signin"}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
              initial={{ opacity: 0, x: isSignUp ? 16 : -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isSignUp ? -16 : 16 }}
              transition={{ duration: 0.2 }}
            >
              {/* Email */}
              <div>
                <label className="text-[13px] text-gray-700 font-medium mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@hospital.org"
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white border border-gray-300 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[13px] text-gray-700 font-medium mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-11 pr-11 py-3 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white border border-gray-300 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (sign-up only) */}
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="text-[13px] text-gray-700 font-medium mb-1.5 block">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className="w-full pl-11 pr-4 py-3 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white border border-gray-300 transition-all"
                    />
                  </div>
                </motion.div>
              )}

              {/* Role Selector */}
              <div>
                <label className="text-[13px] text-gray-700 font-medium mb-1.5 block">Role</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setRoleOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white border border-gray-300 transition-all"
                  >
                    <span>{role}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${roleOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {roleOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-gray-200 overflow-hidden z-10 bg-white shadow-lg"
                      >
                        {ROLES.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => { setRole(r); setRoleOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-[14px] transition-colors ${
                              r === role ? "text-blue-600 bg-blue-50 font-medium" : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-xl text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-all hover:brightness-105 active:scale-[0.98]"
                style={{ background: "#2563eb" }}
              >
                {isSignUp ? "Create Account" : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.form>
          </AnimatePresence>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[12px] text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Toggle sign-in / sign-up */}
          <button
            type="button"
            onClick={() => setIsSignUp((s) => !s)}
            className="w-full py-3 rounded-xl text-[14px] font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            {isSignUp ? "Already have an account? Sign in" : "Create a new account"}
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <span className="text-[11px] text-gray-400">HIPAA Compliant</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span className="text-[11px] text-gray-400">SOC 2 Type II</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span className="text-[11px] text-gray-400">FDA Ready</span>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-3">
          By continuing, you agree to MedBrain&apos;s Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
