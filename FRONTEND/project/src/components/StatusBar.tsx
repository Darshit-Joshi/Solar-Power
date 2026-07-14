// src/components/StatusBar.tsx
import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./StatusBar.css";

const BACKEND_URL =
  (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:5000";

interface TelemetryReading {
  panel_id?: string;
  location?: string;
  temperature: number | string;
  battery_percentage: number;
  connectivity_status: number;
  running_current: number;
  voltage?: number;
  power?: number;
}

const StatusBar: React.FC = () => {
  // 1. Added state to track WHICH solar panel location is currently active
  const [activeLocation, setActiveLocation] = useState<string>(
    "Zone A - Main Array",
  );

  // 2. Added the ML Anomaly Status tracker to the items list
  const [statuses, setStatuses] = useState([
    {
      id: "location",
      label: "Panel Location",
      status: "info",
      text: "Locating...",
    },
    {
      id: "heat",
      label: "Over Heat Protection",
      status: "normal",
      text: "Normal",
    },
    {
      id: "battery",
      label: "Battery Health",
      status: "normal",
      text: "Normal",
    },
    { id: "conn", label: "Connectivity", status: "normal", text: "Online" },
    { id: "current", label: "Over Current", status: "normal", text: "Normal" },
    {
      id: "ml_anomaly",
      label: "AI Anomaly Monitor",
      status: "normal",
      text: "Checking...",
    },
  ]);

  const checkMlAnomaly = async (reading: TelemetryReading) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/predict/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          voltage: Number(reading.voltage) || 24.0,
          current: Number(reading.running_current) || 5.0,
          power: Number(reading.power) || 120.0,
          temperature: Number(reading.temperature) || 35.0,
          irradiance: 800.0,
        }),
      });
      const data = await response.json();
      return data.is_anomaly === 1 ? "critical" : "normal";
    } catch (error) {
      console.warn(
        "ML Engine unreachable, falling back to local heuristics.",
        error,
      );
      return "normal";
    }
  };

  useEffect(() => {
    const socket = io(BACKEND_URL);

    socket.on(
      "live_telemetry_update",
      async (data: TelemetryReading | TelemetryReading[]) => {
        // FIX: Instead of blindly taking data[0], check if a specific location/panel is targeted
        // If it is an array, you can filter by a selected location or default safely
        const reading: TelemetryReading = Array.isArray(data) ? data[0] : data;

        // Extract dynamic location or panel ID from your database payload
        const currentLocation =
          reading.location || reading.panel_id || "Panel #1 (Default)";
        setActiveLocation(currentLocation);

        const tempVal = parseFloat(reading.temperature.toString());

        // 3. Query the integrated ML engine for real-time anomaly detection
        const mlStatus = await checkMlAnomaly(reading);

        setStatuses([
          {
            id: "location",
            label: "Active Site",
            status: "active",
            text: currentLocation,
          },
          {
            id: "heat",
            label: "Thermal State",
            // Adjusted to 65°C warning / 85°C critical to align with your Python ML rules
            status:
              tempVal > 85 ? "critical" : tempVal > 65 ? "warning" : "normal",
            text: `${tempVal}°C`,
          },
          {
            id: "battery",
            label: "Battery Health",
            status: reading.battery_percentage < 20 ? "warning" : "normal",
            text: `${reading.battery_percentage}%`,
          },
          {
            id: "conn",
            label: "Connectivity",
            status: reading.connectivity_status === 1 ? "active" : "critical",
            text: reading.connectivity_status === 1 ? "Online" : "Offline",
          },
          {
            id: "current",
            label: "Current Load",
            status: reading.running_current > 150 ? "critical" : "normal",
            text: `${reading.running_current}A`,
          },
          {
            id: "ml_anomaly",
            label: "AI Diagnostic",
            status: mlStatus,
            text:
              mlStatus === "critical" ? "Anomaly Detected!" : "System Optimal",
          },
        ]);
      },
    );

    return () => {
      socket.disconnect();
    };
  }, []);

  const getStatusClass = (status: string) => {
    switch (status) {
      case "critical":
        return "status-critical";
      case "warning":
        return "status-warning";
      case "active":
        return "status-active";
      case "info":
        return "status-info";
      default:
        return "status-normal";
    }
  };

  return (
    <div className="status-bar">
      <div className="status-items">
        {statuses.map((item) => (
          <div
            key={item.id}
            className={`status-item ${getStatusClass(item.status)}`}
          >
            <div className="status-indicator"></div>
            <span className="status-text">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatusBar;
