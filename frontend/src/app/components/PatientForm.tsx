"use client";

import { useState, useRef } from "react";
import { PatientInput, VitalsInput } from "../lib/api";
import {
  Mic, MicOff, UserPlus, AlertTriangle, Stethoscope, Zap,
} from "lucide-react";

interface Props {
  onSubmit: (patient: PatientInput) => void;
  isLoading: boolean;
}

const DEMO_PATIENTS: PatientInput[] = [
  {
    name: "John Rivera",
    age: 58,
    gender: "Male",
    vitals: { bp_systolic: 185, bp_diastolic: 110, heart_rate: 112, spo2: 93, temperature: 37.2, respiratory_rate: 22 },
    conditions: ["hypertension", "coronary artery disease", "diabetes"],
    symptoms_text: "Severe crushing chest pain radiating to left arm, diaphoresis, shortness of breath",
  },
  {
    name: "Sarah Kim",
    age: 24,
    gender: "Female",
    vitals: { bp_systolic: 118, bp_diastolic: 75, heart_rate: 72, spo2: 99, temperature: 36.8, respiratory_rate: 14 },
    conditions: [],
    symptoms_text: "Mild headache for 2 days, no other symptoms",
  },
  {
    name: "Robert Chen",
    age: 71,
    gender: "Male",
    vitals: { bp_systolic: 95, bp_diastolic: 58, heart_rate: 128, spo2: 91, temperature: 39.4, respiratory_rate: 28 },
    conditions: ["diabetes", "kidney disease", "immunosuppression"],
    symptoms_text: "High fever, confusion, rapid breathing, productive cough with yellow sputum for 3 days",
  },
  {
    name: "Maria Santos",
    age: 35,
    gender: "Female",
    vitals: { bp_systolic: 82, bp_diastolic: 50, heart_rate: 135, spo2: 88, temperature: 36.5, respiratory_rate: 30 },
    conditions: [],
    symptoms_text: "Motor vehicle accident, severe abdominal pain, visible bruising, dizziness, almost lost consciousness",
  },
  {
    name: "James Parker",
    age: 16,
    gender: "Male",
    vitals: { bp_systolic: 120, bp_diastolic: 78, heart_rate: 80, spo2: 98, temperature: 37.1, respiratory_rate: 16 },
    conditions: ["asthma"],
    symptoms_text: "Twisted ankle while playing basketball, mild swelling, can bear weight",
  },
];

const CONDITIONS = [
  "hypertension", "diabetes", "coronary artery disease", "asthma",
  "COPD", "heart failure", "atrial fibrillation", "stroke history",
  "epilepsy", "kidney disease", "liver disease", "cancer",
  "obesity", "smoking history", "immunosuppression", "HIV",
];

export default function PatientForm({ onSubmit, isLoading }: Props) {
  const [name, setName] = useState("");
  const [age, setAge] = useState<number>(45);
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [vitals, setVitals] = useState<VitalsInput>({
    bp_systolic: 130,
    bp_diastolic: 85,
    heart_rate: 88,
    spo2: 96,
    temperature: 37.0,
    respiratory_rate: 16,
  });
  const [conditions, setConditions] = useState<string[]>([]);
  const [symptomsText, setSymptomsText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoIndex, setDemoIndex] = useState(-1);
  const recognitionRef = useRef<ReturnType<typeof Object> | null>(null);

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported"); return; }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setSymptomsText(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const updateVital = (key: keyof VitalsInput, value: string) => {
    setVitals((v) => ({ ...v, [key]: value === "" ? null : parseFloat(value) }));
  };

  const toggleCondition = (c: string) => {
    setConditions((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name || undefined,
      age,
      gender,
      vitals,
      conditions,
      symptoms_text: symptomsText,
    });
  };

  const runAutoDemo = async () => {
    if (demoRunning || isLoading) return;
    setDemoRunning(true);
    for (let i = 0; i < DEMO_PATIENTS.length; i++) {
      setDemoIndex(i);
      const p = DEMO_PATIENTS[i];
      setName(p.name || "");
      setAge(p.age);
      setGender(p.gender as "Male" | "Female" | "Other");
      if (p.vitals) setVitals(p.vitals);
      setConditions(p.conditions || []);
      setSymptomsText(p.symptoms_text);
      // small delay so form visually updates before submitting
      await new Promise(r => setTimeout(r, 400));
      onSubmit(p);
      // wait for the result to render
      await new Promise(r => setTimeout(r, 2200));
    }
    setDemoIndex(-1);
    setDemoRunning(false);
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <div className="card-header flex items-center gap-2">
        <UserPlus className="w-3.5 h-3.5 text-blue-600" />
        <span>Patient Intake</span>
      </div>

      {/* Row 1: Name, Age, Gender */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Name</label>
          <input
            type="text" placeholder="Patient name"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none"
            value={name} onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Age *</label>
          <input
            type="number" min={0} max={120} required
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none"
            value={age} onChange={(e) => setAge(parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Gender *</label>
          <select
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none"
            value={gender} onChange={(e) => setGender(e.target.value as "Male" | "Female" | "Other")}
          >
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
      </div>

      {/* Vitals */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Stethoscope className="w-4 h-4 text-green-400" />
          <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Vitals</label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {([
            ["bp_systolic", "SBP (mmHg)", "90-180"],
            ["bp_diastolic", "DBP (mmHg)", "60-120"],
            ["heart_rate", "HR (bpm)", "40-180"],
            ["spo2", "SpO2 (%)", "70-100"],
            ["temperature", "Temp (°C)", "35-42"],
            ["respiratory_rate", "RR (/min)", "8-40"],
          ] as [keyof VitalsInput, string, string][]).map(([key, label, placeholder]) => (
            <div key={key}>
              <label className="text-xs text-gray-500 mb-1 block">{label}</label>
              <input
                type="number" step="0.1" placeholder={placeholder}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-900 focus:border-blue-500 focus:outline-none tabular-nums"
                value={vitals[key] ?? ""} onChange={(e) => updateVital(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Symptoms (free text + voice) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Symptoms</label>
          <button
            type="button" onClick={toggleVoice}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition ${
              isListening
                ? "bg-red-50 text-red-600 border border-red-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
            {isListening ? "Stop" : "Voice"}
          </button>
        </div>
        <textarea
          rows={3} placeholder="Describe symptoms: e.g., severe chest pain, shortness of breath, dizziness..."
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none resize-none"
          value={symptomsText} onChange={(e) => setSymptomsText(e.target.value)}
        />
      </div>

      {/* Conditions */}
      <div>
        <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-2">Pre-existing Conditions</label>
        <div className="flex flex-wrap gap-1.5">
          {CONDITIONS.map((c) => (
            <button
              key={c} type="button" onClick={() => toggleCondition(c)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                conditions.includes(c)
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Submit + Auto-Demo */}
      <div className="flex gap-2">
        <button
          type="submit" disabled={isLoading || demoRunning}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-xs uppercase tracking-wider py-2 rounded-lg transition flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <AlertTriangle className="w-4 h-4" />
              Triage
            </>
          )}
        </button>
        <button
          type="button"
          onClick={runAutoDemo}
          disabled={isLoading || demoRunning}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition flex items-center gap-1.5"
          title="Auto-triage 5 diverse preset patients"
        >
          {demoRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {demoIndex + 1}/5
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Demo
            </>
          )}
        </button>
      </div>
    </form>
  );
}
