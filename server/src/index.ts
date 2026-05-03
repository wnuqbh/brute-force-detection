import * as express from "express";
import { Request, Response } from "express";
import * as cors from "cors";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import csvParser = require("csv-parser");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Backend is running");
});

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
    typeof req.query.limit === "string" ? Number(req.query.limit) : 20;
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 500)) : 20;

  // When running `npm run dev` from `server/`, cwd is `.../brute-force-detection/server`.
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

app.post("/api/login", (req: Request, res: Response) => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({
      error: "Username and password are required",
    });
  }

  // Demo credentials (override via env vars if desired)
  const expectedUsername = process.env.LOGIN_USERNAME ?? "admin";
  const expectedPassword = process.env.LOGIN_PASSWORD ?? "admin123";

  if (username === expectedUsername && password === expectedPassword) {
    return res.status(200).json({ message: "Login successful" });
  }

  return res.status(401).json({ error: "Invalid username or password" });
});

app.post("/api/predict", async (req: Request, res: Response) => {
  try {
    const inputData = req.body;

    console.log("Sending to ML API:", inputData);

    const response = await axios.post(
      "http://127.0.0.1:8000/predict",
      inputData
    );

    console.log("ML API returned:", response.data);

    res.json(response.data);
  } catch (error: any) {
    console.error("Error calling ML API:", error.message);

    if (error.response) {
      console.error("ML API error response:", error.response.data);
    }

    const status = typeof error?.response?.status === "number" ? error.response.status : 500;
    const details =
      typeof error?.code === "string"
        ? `${error.code}`
        : typeof error?.message === "string"
          ? error.message
          : "Unknown error";

    res.status(500).json({
      error: "Failed to get prediction from ML API",
      hint:
        "Make sure the ML API is running on http://127.0.0.1:8000 (uvicorn src.api:app --reload --port 8000).",
      upstream_status: status,
      details,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
