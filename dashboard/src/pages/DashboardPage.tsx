import { useEffect, useMemo, useState } from "react";
import type { DetectionRow } from "../App";
import {
  Activity,
  Download,
  History,
  Lock,
  LogOut,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import "./DashboardPage.css";

type DashboardPageProps = {
  rows: DetectionRow[];
  dashboardMessage: string;
  onDismissMessage: () => void;
  onClearDashboard: () => void;
  onLogout: () => void;
  onOpenSimulation: () => void;
  onViewHistory: () => void;
};

function DashboardPage({
  rows,
  dashboardMessage,
  onDismissMessage,
  onClearDashboard,
  onLogout,
  onOpenSimulation,
  onViewHistory,
}: DashboardPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 7;
  const sessions = rows;

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const matchesSearch = session.session_id
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ||
        session.result.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [sessions, searchTerm, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSessions.length / rowsPerPage)
  );

  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const totalLoginAttempts = useMemo(() => {
    return sessions.reduce(
      (total, session) => total + session.login_attempts,
      0
    );
  }, [sessions]);

  const totalFailedLogins = useMemo(() => {
    return sessions.reduce(
      (total, session) => total + session.failed_logins,
      0
    );
  }, [sessions]);

  const totalIncidents = useMemo(() => {
    return sessions.filter((session) => session.result === "Compromised")
      .length;
  }, [sessions]);

  function normalizeReputationScore(score: number) {
    if (score <= 1) {
      return Math.round(score * 100);
    }

    return Math.round(score);
  }

  function getReputationClass(score: number) {
    const normalizedScore = normalizeReputationScore(score);

    if (normalizedScore >= 75) return "danger";
    if (normalizedScore >= 40) return "warning";
    return "safe";
  }

  function getRiskLevelClass(riskLevel?: string) {
    const normalizedRiskLevel = riskLevel?.toLowerCase();

    if (normalizedRiskLevel === "high") return "high";
    if (normalizedRiskLevel === "medium") return "medium";
    return "low";
  }

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("All");
    setCurrentPage(1);
  }

  function clearDashboardData() {
    onClearDashboard();
    clearFilters();
  }

  function escapeCsvValue(value: string | number) {
    const stringValue = String(value);

    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  function exportCsv() {
    if (filteredSessions.length === 0) {
      return;
    }

    const headers = [
      "session_id",
      "login_attempts",
      "failed_logins",
      "ip_reputation_score",
      "result",
      "risk_level",
      "probability",
    ];

    const csvRows = filteredSessions.map((session) => [
      session.session_id,
      session.login_attempts,
      session.failed_logins,
      normalizeReputationScore(session.ip_reputation_score),
      session.result,
      session.risk_level ?? "",
      session.probability ?? "",
    ]);

    const csvContent = [headers, ...csvRows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "detection-results.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="dashboard-page">
      <nav className="dashboard-navbar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">
            <Shield size={24} />
          </div>

          <span>
            BruteForce <strong>Sentinel</strong>
          </span>
        </div>

        <div className="dashboard-nav-placeholder" />

        <div className="dashboard-user-area">
          <button className="navbar-history-button" onClick={onViewHistory}>
            <History size={18} />
            View History
          </button>

          <button className="navbar-logout-button" onClick={onLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </nav>

      <section className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Detection Results</h1>
            <p>
              Dashboard starts empty. Run Detection Test or upload a CSV file to
              generate detection results.
            </p>
          </div>

          <div className="dashboard-actions">
            <button className="simulation-button" onClick={onOpenSimulation}>
              Run Detection Test
            </button>

            <button
              className="primary-action"
              onClick={exportCsv}
              disabled={filteredSessions.length === 0}
            >
              <Download size={18} />
              Export CSV
            </button>

            <button
              className="secondary-action"
              onClick={clearDashboardData}
              disabled={sessions.length === 0}
            >
              <Trash2 size={18} />
              Clear Dashboard
            </button>
          </div>
        </div>

        {dashboardMessage && (
          <div className="dashboard-success-message">
            <span>{dashboardMessage}</span>
            <button onClick={onDismissMessage}>Dismiss</button>
          </div>
        )}

        <div className="dashboard-kpi-grid">
          <article className="kpi-card kpi-blue">
            <div>
              <p>Total Login Attempts</p>
              <h2>{totalLoginAttempts.toLocaleString()}</h2>

              <div className="kpi-meta">
                <span className="trend trend-green">
                  {sessions.length === 0 ? "No Data" : "Active"}
                </span>
                <small>Generated from simulation results</small>
              </div>
            </div>

            <div className="kpi-icon blue-icon">
              <Activity size={28} />
            </div>
          </article>

          <article className="kpi-card kpi-yellow">
            <div>
              <p>Failed Logins</p>
              <h2>{totalFailedLogins.toLocaleString()}</h2>

              <div className="kpi-meta">
                <span className="trend trend-yellow">
                  {sessions.length === 0 ? "No Data" : "Tracked"}
                </span>
                <small>Based on simulated login attempts</small>
              </div>
            </div>

            <div className="kpi-icon yellow-icon">
              <Lock size={28} />
            </div>
          </article>

          <article className="kpi-card kpi-red">
            <div>
              <p>Brute-Force Incidents</p>
              <h2>{totalIncidents.toLocaleString()}</h2>

              <div className="kpi-meta">
                <span className="trend trend-red">
                  {totalIncidents > 0 ? "Detected" : "None"}
                </span>
                <small>Compromised sessions only</small>
              </div>
            </div>

            <div className="kpi-icon red-icon">
              <ShieldAlert size={28} />
            </div>
          </article>
        </div>

        <div className="dashboard-filter-bar">
          <div className="filter-input">
            <Search size={19} />

            <input
              type="text"
              placeholder="Search Session ID..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="filter-label">Filters:</div>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">Status: All</option>
            <option value="compromised">Compromised</option>
            <option value="benign">Benign</option>
          </select>

          <button className="clear-filter" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>

        <section className="dashboard-table-card">
          {sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Shield size={34} />
              </div>

              <h2>No detection data yet</h2>

              <p>
                Run a detection test, upload a CSV file, or view history to
                generate detection results.
              </p>

              <button className="simulation-button" onClick={onOpenSimulation}>
                Run Detection Test
              </button>
            </div>
          ) : (
            <>
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Session ID</th>
                    <th>Login Attempts</th>
                    <th>Failed Logins</th>
                    <th>IP Reputation Score</th>
                    <th className="table-center">Result</th>
                    <th className="table-center">Risk Level</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedSessions.map((session, index) => {
                    const reputationClass = getReputationClass(
                      session.ip_reputation_score
                    );

                    const normalizedReputationScore = normalizeReputationScore(
                      session.ip_reputation_score
                    );

                    const riskClass = getRiskLevelClass(session.risk_level);

                    return (
                      <tr key={`${session.session_id}-${index}`}>
                        <td>{session.session_id}</td>
                        <td>{session.login_attempts}</td>
                        <td>{session.failed_logins}</td>

                        <td>
                          <span className={`reputation ${reputationClass}`}>
                            {normalizedReputationScore} / 100
                          </span>
                        </td>

                        <td className="table-center">
                          <span
                            className={
                              session.result === "Compromised"
                                ? "status-badge compromised"
                                : "status-badge benign"
                            }
                          >
                            {session.result}
                          </span>
                        </td>

                        <td className="table-center">
                          <span className={`risk-badge ${riskClass}`}>
                            {session.risk_level || "Low"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredSessions.length === 0 && (
                <div className="empty-state">
                  <h2>No matching results found</h2>
                  <p>Try changing your search or filter.</p>
                </div>
              )}

              <div className="table-footer">
                <p>
                  Showing{" "}
                  <strong>
                    {filteredSessions.length === 0
                      ? "0"
                      : `${(currentPage - 1) * rowsPerPage + 1}-${Math.min(
                          currentPage * rowsPerPage,
                          filteredSessions.length
                        )}`}
                  </strong>{" "}
                  of{" "}
                  <strong>{filteredSessions.length.toLocaleString()}</strong>{" "}
                  results
                </p>

                <div className="pagination">
                  <button
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                  >
                    ‹
                  </button>

                  <span className="active-page">{currentPage}</span>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

export default DashboardPage;