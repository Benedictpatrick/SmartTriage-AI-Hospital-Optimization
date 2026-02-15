"use client";

import { useState } from "react";
import { Upload, FileText, Pill, AlertTriangle, Tag, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

interface EHRResult {
  raw_text: string;
  medications: string[];
  diagnoses: string[];
  allergies: string[];
  keywords: string[];
}

export default function EHRUpload() {
  const [result, setResult] = useState<EHRResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      setError("Only PDF files are supported");
      return;
    }
    setLoading(true);
    setError(null);
    setFileName(file.name);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/api/triage/ehr/extract`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
      const data: EHRResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="card">
      <div className="card-header flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-purple-600" />
        <span>EHR Document Extraction</span>
      </div>

      {/* Drop zone */}
      {!result && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`mt-3 flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
            dragOver
              ? "border-purple-500 bg-purple-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400"
          }`}
          onClick={() => document.getElementById("ehr-file-input")?.click()}
        >
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
              <span className="text-xs text-gray-500">Extracting data from {fileName}...</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-500">
                Drop a PDF here or <span className="text-purple-600 underline">browse</span>
              </span>
              <span className="text-[9px] text-gray-400">Supported: .pdf medical records</span>
            </>
          )}
          <input
            id="ehr-file-input"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={onFileInput}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                Extracted from {fileName}
              </span>
              <button
                onClick={() => { setResult(null); setFileName(null); }}
                className="p-0.5 rounded hover:bg-gray-100 text-gray-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Diagnoses */}
            {result.diagnoses.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-cyan-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Diagnoses
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.diagnoses.map((d, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-50 text-cyan-700 border border-cyan-200">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Medications */}
            {result.medications.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-green-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Pill className="w-3 h-3" /> Medications
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.medications.map((m, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-green-50 text-green-700 border border-green-200">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Allergies */}
            {result.allergies.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Allergies
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.allergies.map((a, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-red-50 text-red-700 border border-red-200">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            {result.keywords.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Keywords
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.keywords.map((k, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 border border-gray-200">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Raw text preview */}
            {result.raw_text && (
              <details className="group">
                <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-gray-600">
                  Raw extracted text ({result.raw_text.length} chars)
                </summary>
                <pre className="mt-1 p-2 rounded bg-gray-50 border border-gray-200 text-[10px] text-gray-500 max-h-32 overflow-auto whitespace-pre-wrap font-mono">
                  {result.raw_text}
                </pre>
              </details>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
