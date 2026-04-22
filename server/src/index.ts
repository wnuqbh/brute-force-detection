import * as express from "express";
import { Request, Response } from "express";
import * as cors from "cors";
import axios from "axios";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Backend is running");
});

app.get("/api/sessions", (req: Request, res: Response) => {
  const sessions = [
    {
      session_id: "S001",
      failed_logins: 18,
      ip_reputation_score: 0.95,
      login_attempts: 20,
      session_duration: 300,
      network_packet_size: 1200,
    },
    {
      session_id: "S002",
      failed_logins: 2,
      ip_reputation_score: 0.1,
      login_attempts: 3,
      session_duration: 120,
      network_packet_size: 450,
    },
    {
      session_id: "S003",
      failed_logins: 10,
      ip_reputation_score: 0.72,
      login_attempts: 12,
      session_duration: 240,
      network_packet_size: 900,
    },
    {
      session_id: "S004",
      failed_logins: 1,
      ip_reputation_score: 0.05,
      login_attempts: 2,
      session_duration: 80,
      network_packet_size: 300,
    },
    {
      session_id: "S005",
      failed_logins: 15,
      ip_reputation_score: 0.88,
      login_attempts: 17,
      session_duration: 280,
      network_packet_size: 1100,
    },
  ];

  res.json(sessions);
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

    res.status(500).json({
      error: "Failed to get prediction from ML API",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});