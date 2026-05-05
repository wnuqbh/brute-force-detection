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

  return (
    <DashboardPage
      rows={dashboardRows}
      onClearDashboard={handleClearDashboard}
      onLogout={handleLogout}
      onOpenSimulation={() => setPage("simulation")}
    />
  );
}

export default App;