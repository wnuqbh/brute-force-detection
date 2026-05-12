import { useState, type ChangeEvent } from "react";
import type { DetectionRow } from "../App";
import "./SimulationPage.css";

type SimulationPageProps = {
  onBack: () => void;
  onSimulationResult: (row: DetectionRow) => void;
  onCsvUploadResult: (rows: DetectionRow[]) => void;
};

type SimulationResult = {
  session_id?: string;
  prediction: number;
  probability?: number;
  risk_level?: string;
  threshold?: number;
  features_used?: Record<string, number>;
};

type CsvInputRow = {
  session_id: string;
  login_attempts: number;
  failed_logins: number;
  ip_reputation_score: number;
};

function SimulationPage({
  onBack,
  onSimulationResult,
  onCsvUploadResult,
}: SimulationPageProps) {
  const [sessionId, setSessionId] = useState("");
  const [loginAttempts, setLoginAttempts] = useState("");
  const [failedLogins, setFailedLogins] = useState("");
  const [ipReputationScore, setIpReputationScore] = useState("");

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizeIpScore = (score: number) => {
    return score > 1 ? score / 100 : score;
  };

  const resetInvalidInput = () => {
    setSessionId("");
    setLoginAttempts("");
    setFailedLogins("");
    setIpReputationScore("");
    setResult(null);
  };

  const clearForm = () => {
    setSessionId("");
    setLoginAttempts("");
    setFailedLogins("");
    setIpReputationScore("");
    setResult(null);
    setError("");
  };

  const validateSimulationInput = () => {
    if (!sessionId || !loginAttempts || !failedLogins || !ipReputationScore) {
      throw new Error("Please fill in all fields before analyzing the session.");
    }

    const loginAttemptsNumber = Number(loginAttempts);
    const failedLoginsNumber = Number(failedLogins);
    const rawIpScoreNumber = Number(ipReputationScore);
    const ipScoreNumber = normalizeIpScore(rawIpScoreNumber);

    if (
      Number.isNaN(loginAttemptsNumber) ||
      Number.isNaN(failedLoginsNumber) ||
      Number.isNaN(rawIpScoreNumber)
    ) {
      throw new Error(
        "Login attempts, failed logins, and IP reputation score must be numbers."
      );
    }

    if (
      loginAttemptsNumber < 0 ||
      failedLoginsNumber < 0 ||
      rawIpScoreNumber < 0
    ) {
      throw new Error("Values cannot be negative.");
    }

    if (failedLoginsNumber > loginAttemptsNumber) {
      throw new Error("Failed logins cannot be greater than login attempts.");
    }

    if (ipScoreNumber > 1) {
      throw new Error(
        "IP reputation score must be between 0 and 100, or 0 and 1."
      );
    }

    return {
      loginAttemptsNumber,
      failedLoginsNumber,
      ipScoreNumber,
    };
  };

  const runSimulation = async () => {
    setError("");
    setResult(null);

    try {
      const { loginAttemptsNumber, failedLoginsNumber, ipScoreNumber } =
        validateSimulationInput();

      setLoading(true);

      const response = await fetch("http://localhost:5000/api/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          login_attempts: loginAttemptsNumber,
          failed_logins: failedLoginsNumber,
          ip_reputation_score: ipScoreNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.details?.detail ||
            errorData?.details ||
            errorData?.error ||
            "Prediction request failed."
        );
      }

      const data: SimulationResult = await response.json();

      setResult(data);

      const resultRow: DetectionRow = {
        session_id: sessionId,
        login_attempts: loginAttemptsNumber,
        failed_logins: failedLoginsNumber,
        ip_reputation_score: ipScoreNumber,
        result: data.prediction === 1 ? "Compromised" : "Benign",
        risk_level: data.risk_level,
        probability: data.probability,
      };

      onSimulationResult(resultRow);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unable to run detection test. Make sure the backend and ML API are running.";

      const isValidationError =
        errorMessage.includes("fill in all fields") ||
        errorMessage.includes("must be numbers") ||
        errorMessage.includes("cannot be negative") ||
        errorMessage.includes("greater than login attempts") ||
        errorMessage.includes("IP reputation score");

      if (isValidationError) {
  resetInvalidInput();
  setError(errorMessage);

  setTimeout(() => {
    setError("");
  }, 2000);

  return;
}

setError(errorMessage);

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const parseCsvRows = (text: string): CsvInputRow[] => {
    const lines = text.trim().split(/\r?\n/);

    if (lines.length < 2) {
      throw new Error("CSV file must have a header row and at least one data row.");
    }

    const headers = lines[0].split(",").map((header) =>
      header
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
    );

    const requiredColumns = [
      "session_id",
      "login_attempts",
      "failed_logins",
      "ip_reputation_score",
    ];

    const hasRequiredColumns = requiredColumns.every((column) =>
      headers.includes(column)
    );

    if (!hasRequiredColumns) {
      throw new Error(
        "CSV must include: session_id, login_attempts, failed_logins, ip_reputation_score"
      );
    }

    return lines
      .slice(1)
      .filter((line) => line.trim() !== "")
      .map((line, index) => {
        const values = line.split(",").map((value) => value.trim());
        const row: Record<string, string> = {};

        headers.forEach((header, headerIndex) => {
          row[header] = values[headerIndex] || "";
        });

        const loginAttemptsValue = Number(row.login_attempts);
        const failedLoginsValue = Number(row.failed_logins);
        const rawIpScoreValue = Number(row.ip_reputation_score);
        const ipScoreValue = normalizeIpScore(rawIpScoreValue);

        if (
          Number.isNaN(loginAttemptsValue) ||
          Number.isNaN(failedLoginsValue) ||
          Number.isNaN(rawIpScoreValue)
        ) {
          throw new Error("CSV contains invalid number values.");
        }

        if (
          loginAttemptsValue < 0 ||
          failedLoginsValue < 0 ||
          rawIpScoreValue < 0
        ) {
          throw new Error("CSV values cannot be negative.");
        }

        if (failedLoginsValue > loginAttemptsValue) {
          throw new Error(
            "CSV failed_logins cannot be greater than login_attempts."
          );
        }

        if (ipScoreValue > 1) {
          throw new Error(
            "CSV IP reputation score must be between 0 and 100, or 0 and 1."
          );
        }

        return {
          session_id: row.session_id || `CSV-${index + 1}`,
          login_attempts: loginAttemptsValue,
          failed_logins: failedLoginsValue,
          ip_reputation_score: ipScoreValue,
        };
      });
  };

  const predictCsvRow = async (row: CsvInputRow): Promise<DetectionRow> => {
    const response = await fetch("http://localhost:5000/api/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(row),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      throw new Error(
        errorData?.details?.detail ||
          errorData?.details ||
          errorData?.error ||
          `Prediction failed for ${row.session_id}`
      );
    }

    const data: SimulationResult = await response.json();

    return {
      session_id: row.session_id,
      login_attempts: row.login_attempts,
      failed_logins: row.failed_logins,
      ip_reputation_score: row.ip_reputation_score,
      result: data.prediction === 1 ? "Compromised" : "Benign",
      risk_level: data.risk_level,
      probability: data.probability,
    };
  };

  const handleCsvFile = (event: ChangeEvent<HTMLInputElement>) => {
    setError("");
    setResult(null);

    const input = event.target;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a CSV file only.");
      input.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        setLoading(true);

        const text = String(reader.result);
        const parsedRows = parseCsvRows(text);

        const predictedRows = await Promise.all(
          parsedRows.map((row) => predictCsvRow(row))
        );

        onCsvUploadResult(predictedRows);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to read CSV file. Please check your file format."
        );
      } finally {
        setLoading(false);
        input.value = "";
      }
    };

    reader.readAsText(file);
  };

  const predictionLabel =
    result?.prediction === 1
      ? "Compromised"
      : result?.prediction === 0
      ? "Benign"
      : "";

  return (
    <div className="simulation-page">
      <div className="simulation-header">
        <div>
          <p className="simulation-eyebrow">BruteForce Sentinel</p>
          <h1>Detection Test</h1>
          <p className="simulation-subtitle">
            Enter login activity details and let the machine learning model
            classify the session.
          </p>
        </div>

        <button className="back-button" onClick={onBack}>
          Back to Dashboard
        </button>
      </div>

      <div className="simulation-grid">
        <div className="simulation-card">
          <h2>Session Input</h2>

          <p className="card-description">
            Enter sample session behavior to test whether the login pattern
            appears benign or compromised.
          </p>

          <div className="form-group">
            <label>Session ID</label>
            <input
              type="text"
              placeholder="Example: SIM-001"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Login Attempts</label>
            <input
              type="number"
              placeholder="Example: 12"
              value={loginAttempts}
              onChange={(event) => setLoginAttempts(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Failed Logins</label>
            <input
              type="number"
              placeholder="Example: 9"
              value={failedLogins}
              onChange={(event) => setFailedLogins(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>IP Reputation Score</label>
            <input
              type="number"
              placeholder="Example: 75 or 0.75"
              value={ipReputationScore}
              onChange={(event) => setIpReputationScore(event.target.value)}
            />

            <small>
              You can enter 75 or 0.75. The system will normalize it
              automatically.
            </small>
          </div>

          {error && <div className="simulation-error">{error}</div>}

          <div className="simulation-actions">
            <button
              className="primary-button"
              onClick={runSimulation}
              disabled={loading}
            >
              {loading ? "Analyzing..." : "Analyze Session"}
            </button>

            <label className="csv-upload-button">
              {loading ? "Uploading..." : "Upload CSV"}
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFile}
                disabled={loading}
              />
            </label>

            <button
              className="secondary-button"
              onClick={clearForm}
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="result-card">
          <h2>Prediction Result</h2>

          {!result && (
            <div className="empty-result">
              <div className="result-icon">🛡️</div>
              <p>No detection test has been run yet.</p>
              <span>Fill in the form and click Analyze Session.</span>
            </div>
          )}

          {result && (
            <div
              className={
                predictionLabel === "Compromised"
                  ? "prediction-box compromised"
                  : "prediction-box benign"
              }
            >
              <p className="result-label">Session Classification</p>
              <h3>{predictionLabel}</h3>

              <div className="result-details">
                <div>
                  <span>Session ID</span>
                  <strong>{sessionId}</strong>
                </div>

                <div>
                  <span>Risk Level</span>
                  <strong>{result.risk_level || "N/A"}</strong>
                </div>

                <div>
                  <span>Probability</span>
                  <strong>
                    {typeof result.probability === "number"
                      ? `${Math.round(result.probability * 100)}%`
                      : "N/A"}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SimulationPage;