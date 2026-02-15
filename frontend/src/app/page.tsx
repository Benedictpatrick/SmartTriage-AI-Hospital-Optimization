"use client";

import { useState } from "react";
import Dashboard from "./components/Dashboard";
import LoadingScreen from "./components/LoadingScreen";
import LoginPage from "./components/LoginPage";

type Phase = "loading" | "login" | "app";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [userRole, setUserRole] = useState("Admin");

  if (phase === "loading") {
    return <LoadingScreen onComplete={() => setPhase("login")} />;
  }

  if (phase === "login") {
    return (
      <LoginPage
        onLogin={(role: string) => {
          setUserRole(role);
          setPhase("app");
        }}
      />
    );
  }

  return <Dashboard role={userRole} />;
}
