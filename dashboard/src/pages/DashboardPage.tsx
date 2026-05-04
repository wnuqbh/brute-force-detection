import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Download,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  User,
  Activity,
  LogOut,
} from "lucide-react";
import "./DashboardPage.css";

type DashboardPageProps = {
  onLogout: () => void;
};

type SessionInput = {
  session_id: string;
  network_packet_size: number;
  protocol_type: string;
  login_attempts: number;
  session_duration: number;
  encryption_used: string;
  ip_reputation_score: number;
  failed_logins: number;
  browser_type: string;
  unusual_time_access: number;
  attack_detected?: number;
};

type PredictionResult = {
  prediction: number;
  probability?: number;
  risk_level?: string;
};

type SessionRow = SessionInput & {
  prediction?: number;
  probability?: number;
  risk_level?: string;
};

export default function DashboardPage({ onLogout }: DashboardPageProps) {
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const rowsPerPage = 7;

  async function loadSessions() {
    try {
      setLoading(true);
      setError("");

      const sessionsResponse = await fetch("http://localhost:5000/api/sessions");

      if (!sessionsResponse.ok) {
        throw new Error("Failed to fetch sessions from backend.");
      }

      const sessionData: SessionInput[] = await sessionsResponse.json();

      const predictedSessions = await Promise.all(
        sessionData.map(async (session) => {
          try {
            const predictionResponse = await fetch(
              "http://localhost:5000/api/predict",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(session),
              }
            );

            if (!predictionResponse.ok) {
              return session;
            }

            const predictionData: PredictionResult =
              await predictionResponse.json();

            return {
              ...session,
              prediction: predictionData.prediction,
              probability: predictionData.probability,
              risk_level: predictionData.risk_level,
            };
          } catch {
            return session;
          }
        })
      );

      setSessions(predictedSessions);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const result = getResultLabel(session);
      const matchesSearch = session.session_id
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || result.toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [sessions, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / rowsPerPage));

const paginatedSessions = filteredSessions.slice(
  (currentPage - 1) * rowsPerPage,
  currentPage * rowsPerPage
);

  const totalLoginAttempts = useMemo(() => {
    return sessions.reduce((total, session) => total + session.login_attempts, 0);
  }, [sessions]);

  const totalFailedLogins = useMemo(() => {
    return sessions.reduce((total, session) => total + session.failed_logins, 0);
  }, [sessions]);

  const totalIncidents = useMemo(() => {
    return sessions.filter((session) => getResultLabel(session) === "Compromised")
      .length;
  }, [sessions]);

  function getResultLabel(session: SessionRow) {
    const attackValue = session.prediction ?? session.attack_detected ?? 0;

    return Number(attackValue) === 1 ? "Compromised" : "Benign";
  }

    function normalizeReputationScore(score: number) {
    if (score <= 1) {
        return Math.round(score * 100);
    }

    return Math.round(score);
    }

    function getReputationClass(score: number) {
    const normalizedScore = normalizeReputationScore(score);

    if (normalizedScore < 40) return "danger";
    if (normalizedScore < 75) return "warning";
    return "safe";
    }

  function exportCsv() {
    const headers = [
      "session_id",
      "login_attempts",
      "failed_logins",
      "ip_reputation_score",
      "result",
    ];

    const rows = filteredSessions.map((session) => [
      session.session_id,
      session.login_attempts,
      session.failed_logins,
      session.ip_reputation_score,
      getResultLabel(session),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
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

        <div className="dashboard-nav-links">
          <button className="active">Dashboard</button>
          <button>Detection Logs</button>
          <button>Rules</button>
          <button>Settings</button>
        </div>

        <div className="dashboard-user-area">
          <Bell size={22} />
          <div className="dashboard-avatar">
            <User size={22} />
          </div>
        </div>
      </nav>

      <section className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Detection Results</h1>
            <p>
              Real-time analysis of authentication attempts. Monitoring
              brute-force patterns across all registered endpoints.
            </p>
          </div>

          <div className="dashboard-actions">
            <button className="secondary-action" onClick={loadSessions}>
              <RefreshCw size={18} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button className="primary-action" onClick={exportCsv}>
              <Download size={18} />
              Export CSV
            </button>

            <button className="logout-action" onClick={onLogout}>
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        <div className="dashboard-kpi-grid">
          <article className="kpi-card kpi-blue">
            <div>
              <p>Total Login Attempts</p>
              <h2>{totalLoginAttempts.toLocaleString()}</h2>
              <div className="kpi-meta">
                <span className="trend trend-green">↗ 12%</span>
                <small>Increase vs last 24h</small>
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
                <span className="trend trend-yellow">High Vol</span>
                <small>Unusual spike detected</small>
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
                <span className="trend trend-red">Critical</span>
                <small>Requires immediate attention</small>
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

          <select>
            <option>Time: Last 24 Hours</option>
            <option>Time: Last 7 Days</option>
            <option>Time: Last 30 Days</option>
          </select>

          <button
            className="clear-filter"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("All");
              setCurrentPage(1);
            }}
          >
            Clear All
          </button>
        </div>

        {error && <div className="dashboard-error">{error}</div>}

        <section className="dashboard-table-card">
          <table>
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Login Attempts</th>
                <th>Failed Logins</th>
                <th>IP Reputation Score</th>
                <th>Result</th>
              </tr>
            </thead>

            <tbody>
              {filteredSessions.map((session) => {
                const result = getResultLabel(session);
                const reputationClass = getReputationClass(
                  session.ip_reputation_score
                );

                return (
                  <tr key={session.session_id}>
                    <td>{session.session_id}</td>
                    <td>{session.login_attempts}</td>
                    <td>{session.failed_logins}</td>
                    <td>
                      <span className={`reputation ${reputationClass}`}>
                        {normalizeReputationScore(session.ip_reputation_score)} / 100
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          result === "Compromised"
                            ? "status-badge compromised"
                            : "status-badge benign"
                        }
                      >
                        {result}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredSessions.length === 0 && !loading && (
            <div className="empty-state">
              No sessions found. Make sure your backend is running.
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
    of <strong>{filteredSessions.length.toLocaleString()}</strong> results
  </p>

  <div className="pagination">
    <button
      disabled={currentPage === 1}
      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
    >
      ‹
    </button>

    <button
      className={currentPage === 1 ? "active-page" : ""}
      onClick={() => setCurrentPage(1)}
    >
      1
    </button>

    {totalPages >= 2 && (
      <button
        className={currentPage === 2 ? "active-page" : ""}
        onClick={() => setCurrentPage(2)}
      >
        2
      </button>
    )}

    {totalPages >= 3 && (
      <button
        className={currentPage === 3 ? "active-page" : ""}
        onClick={() => setCurrentPage(3)}
      >
        3
      </button>
    )}

    {totalPages > 4 && <span>...</span>}

    {totalPages > 3 && (
      <button
        className={currentPage === totalPages ? "active-page" : ""}
        onClick={() => setCurrentPage(totalPages)}
      >
        {totalPages}
      </button>
    )}

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
        </section>
      </section>
    </main>
  );
}