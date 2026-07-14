import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from utils.preprocessing import clean_telemetry_data, prepare_forecast_features

load_dotenv()
app = FastAPI(title="Solar Power ML Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Data Schemas ---
class TelemetryReading(BaseModel):
    timestamp: str
    voltage: float = Field(..., ge=0, description="Panel voltage in Volts")
    current: float = Field(..., ge=0, description="Current in Amperes")
    power: float = Field(..., ge=0, description="Power output in Watts")
    temperature: float = Field(..., description="Panel temperature in Celsius")
    irradiance: Optional[float] = Field(default=0.0, ge=0)

class ForecastRequest(BaseModel):
    history: List[TelemetryReading]
    steps_ahead: int = Field(default=6, ge=1, le=24, description="Number of future intervals to forecast")

# --- Load Models ---
MODELS_DIR = os.getenv("MODELS_DIR", "models")

try:
    anomaly_model = joblib.load(os.path.join(MODELS_DIR, "anomaly_model.pkl"))
except Exception as e:
    print(f"[Warn] Could not load anomaly_model.pkl ({e}). Using rule-based fallback.")
    anomaly_model = None

try:
    forecast_model = joblib.load(os.path.join(MODELS_DIR, "forecast_model.pkl"))
except Exception as e:
    print(f"[Warn] Could not load forecast_model.pkl ({e}). Using trend estimation.")
    forecast_model = None

# --- Endpoints ---

@app.post("/api/predict/status")
async def predict_status(data: TelemetryReading):
    """
    Evaluates a single live telemetry frame for immediate equipment anomalies.
    """
    raw_dict = data.model_dump()
    features = clean_telemetry_data(raw_dict)
    
    if anomaly_model:
        # scikit-learn IsolationForest outputs -1 for anomalies, 1 for normal
        prediction = anomaly_model.predict(features)[0]
        is_anomaly = 1 if prediction == -1 else 0
    else:
        # Rule-based fallback: flags high heat or voltage presence without current flow
        is_anomaly = 1 if (data.temperature > 85.0 or (data.voltage > 30 and data.current < 0.1)) else 0
        
    return {
        "timestamp": data.timestamp,
        "is_anomaly": int(is_anomaly),
        "status": "ANOMALY_DETECTED" if is_anomaly else "NORMAL"
    }

@app.post("/api/predict/anomaly-batch")
async def get_batch_anomalies(data: List[TelemetryReading]):
    """
    Scans a rolling time-series window from the Express backend to isolate trend anomalies.
    """
    if not data:
        return []
        
    anomalies = []
    for item in data:
        raw_dict = item.model_dump()
        features = clean_telemetry_data(raw_dict)
        
        if anomaly_model:
            pred = anomaly_model.predict(features)[0]
            is_anom = 1 if pred == -1 else 0
        else:
            is_anom = 1 if (item.temperature > 85.0 or (item.voltage > 30 and item.current < 0.1)) else 0
            
        if is_anom:
            anomalies.append({
                "timestamp": item.timestamp,
                "is_anomaly": 1,
                "reason": "Threshold exceedance across power/temperature correlation",
                "metrics": raw_dict
            })
            
    return anomalies

@app.post("/api/predict/forecast")
async def predict_future(payload: ForecastRequest):
    """
    Predicts future power generation (Watts) for the upcoming time steps based on recent history.
    """
    if len(payload.history) < 5:
        raise HTTPException(status_code=400, detail="At least 5 historical data points required for forecasting.")
        
    df = pd.DataFrame([r.model_dump() for r in payload.history])
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp')
    
    if forecast_model:
        X_future = prepare_forecast_features(df, steps=payload.steps_ahead)
        predictions = forecast_model.predict(X_future)
    else:
        # Fallback: Simple moving average + linear slope projection
        recent_avg = df['power'].tail(5).mean()
        slope = (df['power'].iloc[-1] - df['power'].iloc[0]) / max(1, len(df) - 1)
        predictions = [max(0.0, round(recent_avg + (slope * i), 2)) for i in range(1, payload.steps_ahead + 1)]
        
    return {
        "steps_ahead": payload.steps_ahead,
        "forecasted_power": list(predictions)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)