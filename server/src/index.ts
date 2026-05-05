import * as express from "express";
import { Request, Response } from "express";
import * as cors from "cors";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import csvParser = require("csv-parser");
import Database = require("better-sqlite3");
import bcrypt = require("bcryptjs");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

/* =========================
   SQLite Database Setup
========================= */

const databasePath = path.resolve(process.cwd(), "database.db");
const db = new Database(databasePath);

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  created_at: string;
};

function createDefaultAdminUser() {
  const defaultUsername = "admin";
  const defaultPassword = "Admin@123";

  const existingUser = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(defaultUsername) as UserRow | undefined;

  if (!existingUser) {
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    db.prepare(`
      INSERT INTO users (username, password_hash, role)
      VALUES (?, ?, ?)
    `).run(defaultUsername, passwordHash, "admin");

    console.log("Default admin user created");
    console.log("Username: admin");
    console.log("Password: Admin@123");
  }
}

createDefaultAdminUser();

/* =========================
   Basic Route
========================= */

app.get("/", (req: Request, res: Response) => {
  res.send("Backend is running");
});

/* =========================
   Sessions Route
========================= */

app.get("/api/sessions", (req: Request, res: Response) => {
  const sessions: Array<{
    session_id: string;
    failed_logins: number;
    ip_reputation_score: number;
    login_attempts: number;
    session_duration: number;
    network_packet_size: number;
  }> = [];

  const limit =
    typeof req.query.limit === "string" ? Number(req.query.limit) : 500;

  const safeLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(limit, 500))
    : 500;

  const csvPath = path.resolve(
    process.cwd(),
    "../data/cybersecurity_intrusion_data.csv"
  );

  if (!fs.existsSync(csvPath)) {
    return res.status(500).json({
      error: "CSV dataset not found",
      csvPath,
    });
  }

  fs.createReadStream(csvPath)
    .pipe(csvParser())
    .on("data", (row: any) => {
      if (sessions.length >= safeLimit) return;

      sessions.push({
        session_id: String(row.session_id ?? ""),
        failed_logins: Number(row.failed_logins),
        ip_reputation_score: Number(row.ip_reputation_score),
        login_attempts: Number(row.login_attempts),
        session_duration: Number(row.session_duration),
        network_packet_size: Number(row.network_packet_size),
      });
    })
    .on("end", () => {
      res.json(sessions);
    })
    .on("error", (error: unknown) => {
      console.error("Error reading CSV:", error);
      res.status(500).json({ error: "Failed to read CSV data" });
    });
});

/* =========================
   Database Login Route
========================= */

app.post("/api/login", (req: Request, res: Response) => {
  try {
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
    }

    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as UserRow | undefined;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password",
      });
    }

    const passwordMatches = bcrypt.compareSync(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      error: "Login failed due to server error",
    });
  }
});

/* =========================
   Prediction Route
========================= */

type PredictRequestBody = {
  session_id?: string;
  login_attempts?: number | string;
  failed_logins?: number | string;
  ip_reputation_score?: number | string;
};

app.post("/api/predict", async (req: Request, res: Response) => {
  try {
    const {
      session_id,
      login_attempts,
      failed_logins,
      ip_reputation_score,
    } = req.body as PredictRequestBody;

    if (!session_id) {
      return res.status(400).json({
        error: "session_id is required",
      });
    }

    const loginAttemptsNumber = Number(login_attempts);
    const failedLoginsNumber = Number(failed_logins);
    let ipReputationScoreNumber = Number(ip_reputation_score);

    if (
      Number.isNaN(loginAttemptsNumber) ||
      Number.isNaN(failedLoginsNumber) ||
      Number.isNaN(ipReputationScoreNumber)
    ) {
      return res.status(400).json({
        error:
          "login_attempts, failed_logins, and ip_reputation_score must be valid numbers",
      });
    }

    if (
      loginAttemptsNumber < 0 ||
      failedLoginsNumber < 0 ||
      ipReputationScoreNumber < 0
    ) {
      return res.status(400).json({
        error: "Input values cannot be negative",
      });
    }

    if (failedLoginsNumber > loginAttemptsNumber) {
      return res.status(400).json({
        error: "failed_logins cannot be greater than login_attempts",
      });
    }

    if (ipReputationScoreNumber > 1) {
      ipReputationScoreNumber = ipReputationScoreNumber / 100;
    }

    if (ipReputationScoreNumber > 1) {
      return res.status(400).json({
        error: "ip_reputation_score must be between 0 and 100, or 0 and 1",
      });
    }

    const inputData = {
      session_id,
      login_attempts: loginAttemptsNumber,
      failed_logins: failedLoginsNumber,
      ip_reputation_score: ipReputationScoreNumber,
    };

    console.log("Sending to ML API:", inputData);

    const response = await axios.post(
      "http://127.0.0.1:8000/predict",
      inputData
    );

    console.log("ML API returned:", response.data);

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error("Error calling ML API:", error.message);

    if (error.response) {
      console.error("ML API error response:", error.response.data);
    }

    const status =
      typeof error?.response?.status === "number" ? error.response.status : 500;

    const details =
      error?.response?.data ??
      (typeof error?.message === "string" ? error.message : "Unknown error");

    return res.status(status).json({
      error: "Failed to get prediction from ML API",
      hint:
        "Make sure the ML API is running on http://127.0.0.1:8000",
      upstream_status: status,
      details,
    });
  }
});

/* =========================
   Start Server
========================= */

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`SQLite database: ${databasePath}`);
});