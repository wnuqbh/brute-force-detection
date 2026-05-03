import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

type SessionInput = {
  session_id: string;
  failed_logins: number;
  ip_reputation_score: number;
  login_attempts: number;
  session_duration: number;
  network_packet_size: number;
};

type PredictionResult = {
  prediction: number;
  probability: number;
  risk_level: string;
};

type PredictedSession = SessionInput & PredictionResult;

function DashboardPage() {
  const [sessions, setSessions] = useState<PredictedSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async (): Promise<SessionInput[]> => {
    const res = await fetch("http://localhost:5000/api/sessions");

    if (!res.ok) {
      throw new Error("Failed to fetch sessions");
    }

    return res.json();
  };

  const runBatchPrediction = async () => {
    try {
      setLoading(true);
      setError(null);

      const rawSessions = await fetchSessions();

      const results = await Promise.all(
        rawSessions.map(async (session) => {
          const response = await fetch("http://localhost:5000/api/predict", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              failed_logins: session.failed_logins,
              ip_reputation_score: session.ip_reputation_score,
              login_attempts: session.login_attempts,
              session_duration: session.session_duration,
              network_packet_size: session.network_packet_size,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed prediction for ${session.session_id}`);
          }

          const predictionData: PredictionResult = await response.json();

          return {
            ...session,
            ...predictionData,
          };
        })
      );

      setSessions(results);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const totalSessions = sessions.length;
  const totalAttacks = sessions.filter((s) => s.prediction === 1).length;
  const normalSessions = sessions.filter((s) => s.prediction === 0).length;

  const detectionRate =
    totalSessions > 0
      ? ((totalAttacks / totalSessions) * 100).toFixed(1)
      : "0.0";

  const attackData = [
    { name: "Attack", value: totalAttacks },
    { name: "Normal", value: normalSessions },
  ];

  const riskCounts = {
    High: sessions.filter((s) => s.risk_level === "High").length,
    Medium: sessions.filter((s) => s.risk_level === "Medium").length,
    Low: sessions.filter((s) => s.risk_level === "Low").length,
  };

  const riskData = [
    { name: "High", value: riskCounts.High },
    { name: "Medium", value: riskCounts.Medium },
    { name: "Low", value: riskCounts.Low },
  ];

  const cardStyle: React.CSSProperties = {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    flex: 1,
    minWidth: "220px",
  };

  const chartCardStyle: React.CSSProperties = {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    flex: 1,
    minWidth: "320px",
  };

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "12px",
    background: "#f1f3f5",
    borderBottom: "1px solid #ddd",
  };

  const tdStyle: React.CSSProperties = {
    padding: "12px",
    borderBottom: "1px solid #eee",
  };

  return (
    <div
      style={{
        padding: "24px",
        fontFamily: "Arial, sans-serif",
        background: "#f5f7fb",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ marginBottom: "16px" }}>Brute Force Detection Dashboard</h1>

      <button
        onClick={runBatchPrediction}
        style={{
          padding: "12px 18px",
          border: "none",
          borderRadius: "8px",
          background: "#1976d2",
          color: "#fff",
          cursor: "pointer",
          marginBottom: "24px",
        }}
      >
        Run Multiple ML Predictions
      </button>

      {loading && <p>Loading predictions...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {sessions.length > 0 && (
        <>
          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "32px",
            }}
          >
            <div style={cardStyle}>
              <h3>Total Sessions</h3>
              <p style={{ fontSize: "28px", fontWeight: "bold" }}>
                {totalSessions}
              </p>
            </div>

            <div style={cardStyle}>
              <h3>Total Attacks</h3>
              <p
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: "#d32f2f",
                }}
              >
                {totalAttacks}
              </p>
            </div>

            <div style={cardStyle}>
              <h3>Normal Sessions</h3>
              <p
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: "#2e7d32",
                }}
              >
                {normalSessions}
              </p>
            </div>

            <div style={cardStyle}>
              <h3>Detection Rate</h3>
              <p style={{ fontSize: "28px", fontWeight: "bold" }}>
                {detectionRate}%
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "24px",
              flexWrap: "wrap",
              marginBottom: "32px",
            }}
          >
            <div style={chartCardStyle}>
              <h3>Attack vs Normal</h3>
              <PieChart width={320} height={260}>
                <Pie
                  data={attackData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={85}
                  label
                >
                  <Cell fill="#d32f2f" />
                  <Cell fill="#2e7d32" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </div>

            <div style={chartCardStyle}>
              <h3>Risk Level Distribution</h3>
              <BarChart width={380} height={260} data={riskData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#1976d2" />
              </BarChart>
            </div>
          </div>

          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              overflowX: "auto",
            }}
          >
            <h2 style={{ marginBottom: "16px" }}>Predicted Sessions</h2>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Session ID</th>
                  <th style={thStyle}>Failed Logins</th>
                  <th style={thStyle}>IP Reputation</th>
                  <th style={thStyle}>Login Attempts</th>
                  <th style={thStyle}>Session Duration</th>
                  <th style={thStyle}>Packet Size</th>
                  <th style={thStyle}>Prediction</th>
                  <th style={thStyle}>Probability</th>
                  <th style={thStyle}>Risk Level</th>
                </tr>
              </thead>

              <tbody>
                {sessions.map((s) => (
                  <tr key={s.session_id}>
                    <td style={tdStyle}>{s.session_id}</td>
                    <td style={tdStyle}>{s.failed_logins}</td>
                    <td style={tdStyle}>{s.ip_reputation_score}</td>
                    <td style={tdStyle}>{s.login_attempts}</td>
                    <td style={tdStyle}>{s.session_duration}</td>
                    <td style={tdStyle}>{s.network_packet_size}</td>
                    <td style={tdStyle}>
                      {s.prediction === 1 ? "Attack" : "Normal"}
                    </td>
                    <td style={tdStyle}>{s.probability}</td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: "bold",
                        color:
                          s.risk_level === "High"
                            ? "#d32f2f"
                            : s.risk_level === "Medium"
                            ? "#f57c00"
                            : "#2e7d32",
                      }}
                    >
                      {s.risk_level}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardPage;