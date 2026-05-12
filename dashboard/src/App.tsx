import { useState } from "react";
import LoginPagePremium from "./pages/LoginPagePremium";
import DashboardPage from "./pages/DashboardPage";
import SimulationPage from "./pages/SimulationPage";

type Page = "dashboard" | "simulation";

export type DetectionRow = {
  session_id: string;
  login_attempts: number;
  failed_logins: number;
  ip_reputation_score: number;
  result: "Compromised" | "Benign";
  risk_level?: string;
  probability?: number;
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [page, setPage] = useState<Page>("dashboard");
  const [dashboardRows, setDashboardRows] = useState<DetectionRow[]>([]);
  const [dashboardMessage, setDashboardMessage] = useState("");

  const handleLogin = () => {
    setIsLoggedIn(true);
    setPage("dashboard");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPage("dashboard");
    setDashboardRows([]);
  };

  const handleSimulationResult = (row: DetectionRow) => {
    setDashboardRows((prev) => [row, ...prev]);
  };

  const handleCsvUploadResult = (rows: DetectionRow[]) => {
  setDashboardRows((prev) => [...rows, ...prev]);

  const compromisedCount = rows.filter(
    (row) => row.result === "Compromised"
  ).length;

  const benignCount = rows.filter(
    (row) => row.result === "Benign"
  ).length;

  setDashboardMessage(
    `CSV uploaded successfully. ${rows.length} sessions analyzed, ${compromisedCount} compromised and ${benignCount} benign.`
  );

  setPage("dashboard");
};

  const handleClearDashboard = () => {
    setDashboardRows([]);
  };

  if (!isLoggedIn) {
    return <LoginPagePremium onLogin={handleLogin} />;
  }

  if (page === "simulation") {
    return (
      <SimulationPage
        onBack={() => setPage("dashboard")}
        onSimulationResult={handleSimulationResult}
        onCsvUploadResult={handleCsvUploadResult}
      />
    );
  }

  const handleLoadHistory = async () => {
  try {
    const response = await fetch("http://localhost:5000/api/detection-logs");

    if (!response.ok) {
      throw new Error("Failed to load detection history.");
    }

    const data = await response.json();

    const historyRows: DetectionRow[] = data.map((item: any) => ({
      session_id: item.session_id,
      login_attempts: Number(item.login_attempts),
      failed_logins: Number(item.failed_logins),
      ip_reputation_score: Number(item.ip_reputation_score),
      result: item.result === "Compromised" ? "Compromised" : "Benign",
      risk_level: item.risk_level || "Low",
      probability:
        typeof item.probability === "number" ? item.probability : undefined,
    }));

    setDashboardRows(historyRows);
    setDashboardMessage(
      `History loaded successfully. ${historyRows.length} saved detection records found.`
    );
  } catch (error) {
    console.error("Failed to load history:", error);
    setDashboardMessage("Failed to load detection history.");
  }
};

  return (
    <DashboardPage
  rows={dashboardRows}
  dashboardMessage={dashboardMessage}
  onDismissMessage={() => setDashboardMessage("")}
  onClearDashboard={handleClearDashboard}
  onLogout={handleLogout}
  onOpenSimulation={() => setPage("simulation")}
  onViewHistory={handleLoadHistory}
/>
  );
}

export default App;