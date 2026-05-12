"""FastAPI inference endpoint for brute force detection."""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import joblib
import pandas as pd
import os

app = FastAPI(
    title="Brute Force Detection API",
    description="Detects brute force attacks using a trained Random Forest model.",
    version="1.0.0",
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "brute_force_detector.pkl")
META_PATH = os.path.join(BASE_DIR, "models", "model_metadata.pkl")

try:
    model = joblib.load(MODEL_PATH)
    print(f"[+] Model loaded from {MODEL_PATH}")
except FileNotFoundError:
    raise RuntimeError(f"Model not found at {MODEL_PATH}. Run train.py first.")

try:
    metadata = joblib.load(META_PATH)
    THRESHOLD = metadata.get("decision_threshold", 0.35)
    EXPECTED_FEATURES = metadata.get("features", [])
    print(f"[+] Metadata loaded. Threshold={THRESHOLD}")
    print(f"[+] Expected features: {EXPECTED_FEATURES}")
except FileNotFoundError:
    THRESHOLD = 0.35
    EXPECTED_FEATURES = [
        "login_attempts",
        "failed_logins",
        "ip_reputation_score",
        "failed_login_ratio",
        "risk_score",
    ]
    print("[!] Metadata not found. Using fallback defaults.")


class PredictRequest(BaseModel):
    session_id: str = Field(..., description="Session ID for dashboard display")
    login_attempts: float = Field(
        ...,
        ge=0,
        description="Total login attempts in the session",
    )
    failed_logins: float = Field(
        ...,
        ge=0,
        description="Number of failed login attempts",
    )
    ip_reputation_score: float = Field(
        ...,
        ge=0,
        description="IP reputation score. Frontend can send 0-100 or 0-1.",
    )


def normalize_ip_score(ip_reputation_score: float) -> float:
    """
    Accept both 0-100 and 0-1 IP reputation score.

    Frontend example:
        95 means 95%

    Model expected format:
        0.95

    Higher score means safer IP.
    """
    if ip_reputation_score > 1:
        ip_reputation_score = ip_reputation_score / 100

    if ip_reputation_score < 0 or ip_reputation_score > 1:
        raise HTTPException(
            status_code=400,
            detail="ip_reputation_score must be between 0 and 1, or 0 and 100",
        )

    return ip_reputation_score


def compute_engineered_features(
    login_attempts: float,
    failed_logins: float,
    ip_reputation_score: float,
) -> dict:
    """
    Compute derived features using the same scale as training.

    The dataset uses ip_reputation_score from 0 to 1.
    Higher ip_reputation_score means safer IP.
    """
    failed_login_ratio = failed_logins / (login_attempts + 1e-6)

    risk_score = failed_login_ratio * (1 - ip_reputation_score)

    return {
        "login_attempts": login_attempts,
        "failed_logins": failed_logins,
        "ip_reputation_score": ip_reputation_score,
        "failed_login_ratio": failed_login_ratio,
        "risk_score": risk_score,
    }


def build_feature_dataframe(feature_dict: dict) -> pd.DataFrame:
    """
    Build model input using the exact feature order saved in model_metadata.pkl.
    """
    if not EXPECTED_FEATURES:
        raise HTTPException(
            status_code=500,
            detail="Model metadata has no expected feature list.",
        )

    missing_features = [
        feature for feature in EXPECTED_FEATURES if feature not in feature_dict
    ]

    if missing_features:
        raise HTTPException(
            status_code=500,
            detail=f"Feature mismatch between API and model: {missing_features}",
        )

    return pd.DataFrame(
        [[feature_dict[feature] for feature in EXPECTED_FEATURES]],
        columns=EXPECTED_FEATURES,
    )


def get_risk_level(prediction: int, probability: float | None) -> str:
    """
    Convert prediction result into readable risk level.
    """
    if prediction == 0:
        return "Low"

    if probability is None:
        return "High"

    if probability >= 0.85:
        return "High"

    if probability >= THRESHOLD:
        return "Medium"

    return "Low"


@app.get("/")
def root():
    return {
        "message": "Brute Force Detection API is running",
        "threshold": THRESHOLD,
        "features": EXPECTED_FEATURES,
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "threshold": THRESHOLD,
        "features": EXPECTED_FEATURES,
    }


@app.post("/predict")
def predict(data: PredictRequest):
    try:
        ip_score = normalize_ip_score(data.ip_reputation_score)

        if data.failed_logins > data.login_attempts:
            raise HTTPException(
                status_code=400,
                detail="failed_logins cannot be greater than login_attempts",
            )

        feature_dict = compute_engineered_features(
            login_attempts=data.login_attempts,
            failed_logins=data.failed_logins,
            ip_reputation_score=ip_score,
        )

        features = build_feature_dataframe(feature_dict)

        print("Received input:", data.dict())
        print("Computed features:", feature_dict)
        print("Final model input:")
        print(features)

        if hasattr(model, "predict_proba"):
            probability = float(model.predict_proba(features)[0][1])
            prediction = int(probability >= THRESHOLD)
        else:
            prediction = int(model.predict(features)[0])
            probability = None

        risk_level = get_risk_level(prediction, probability)

        return {
            "session_id": data.session_id,
            "prediction": prediction,
            "probability": round(probability, 4) if probability is not None else None,
            "risk_level": risk_level,
            "threshold": THRESHOLD,
            "features_used": feature_dict,
        }

    except HTTPException:
        raise

    except Exception as error:
        print("ERROR during prediction:", str(error))
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )