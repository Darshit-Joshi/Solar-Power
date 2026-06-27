# ml-services/app.py
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib
from dotenv import load_dotenv
from utils.preprocessing import clean_telemetry_data

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Models
try:
    anomaly_model = joblib.load('models/anomaly_model.pkl')
except:
    anomaly_model = None # Fallback for development

@app.get("/api/predict/anomaly")
async def get_anomaly():
    return [{"timestamp": "2026-06-27T01:00:00", "is_anomaly": 1}]

@app.post("/api/predict/status")
async def predict_status(data: dict):
    """
    Endpoint for your frontend to send current telemetry 
    and get an AI prediction back.
    """
    if not anomaly_model:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    features = clean_telemetry_data(data)
    prediction = anomaly_model.predict(features)
    return {"prediction": int(prediction[0])}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)