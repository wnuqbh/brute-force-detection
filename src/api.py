from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
import os

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "brute_force_detector.pkl")

model = joblib.load(MODEL_PATH)


class PredictRequest(BaseModel):
    failed_logins: float
    ip_reputation_score: float
    login_attempts: float
    session_duration: float
    network_packet_size: float


@app.get("/")
def root():
    return {"message": "ML API is running"}


@app.post("/predict")
def predict(data: PredictRequest):
    try:
        features = np.array([[
            data.failed_logins,
            data.ip_reputation_score,
            data.login_attempts,
            data.session_duration,
            data.network_packet_size
        ]])

        print("Received input:", data.dict())
        print("Features shape:", features.shape)
        print("Features:", features)

        prediction = int(model.predict(features)[0])

        probability = None
        if hasattr(model, "predict_proba"):
            probability = float(model.predict_proba(features)[0][1])

        risk_level = "Low"
        if prediction == 1:
            if probability is not None:
                if probability >= 0.85:
                    risk_level = "High"
                elif probability >= 0.60:
                    risk_level = "Medium"
                else:
                    risk_level = "Low"
            else:
                risk_level = "High"

        return {
            "prediction": prediction,
            "probability": probability,
            "risk_level": risk_level
        }

    except Exception as e:
        print("ERROR during prediction:", str(e))
        raise e