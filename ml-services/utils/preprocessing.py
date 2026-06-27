# ml-services/utils/preprocessing.py
import numpy as np

def clean_telemetry_data(data):
    """
    Standardize incoming raw IoT data before model inference.
    Handles missing values or type conversion.
    """
    # Example: Ensure all inputs are numeric and handle missing fields
    processed = {
        "battery_percentage": float(data.get("battery_percentage", 0)),
        "temperature": float(data.get("temperature", 25.0)),
        "running_current": float(data.get("running_current", 0)),
        "motor_speed": float(data.get("motor_speed", 0))
    }
    return np.array([[processed["battery_percentage"], processed["temperature"], 
                      processed["running_current"], processed["motor_speed"]]])