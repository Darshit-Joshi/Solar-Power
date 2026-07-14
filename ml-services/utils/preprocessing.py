import numpy as np
import pandas as pd

def clean_telemetry_data(data: dict) -> np.ndarray:
    """
    Extracts, orders, and cleans raw telemetry dictionary values into a 2D numpy array.
    """
    # Strict feature order must match exactly how the .pkl model was trained
    feature_keys = ['voltage', 'current', 'power', 'temperature']
    
    # Extract values safely, defaulting to 0.0 if missing
    features = [float(data.get(k, 0.0)) for k in feature_keys]
    
    # Clean noise: clamp negative electrical values to zero
    features = [max(0.0, val) for val in features]
    
    # Reshape to (1, 4) for single-sample scikit-learn inference
    return np.array(features).reshape(1, -1)


def prepare_forecast_features(df: pd.DataFrame, steps: int) -> np.ndarray:
    """
    Generates time-step sequence matrices for future regression predictions.
    """
    last_index = len(df)
    future_indices = np.arange(last_index, last_index + steps).reshape(-1, 1)
    return future_indices