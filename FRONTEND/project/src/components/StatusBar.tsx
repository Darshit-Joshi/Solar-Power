// src/components/StatusBar.tsx
import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./StatusBar.css";

const BACKEND_URL =
  (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:5000";

const StatusBar: React.FC = () => {
  // 1. We define the items with a 'key' that matches your telemetry data
  const [statuses, setStatuses] = useState([
    { id: "heat", label: "Over Heat Protection", status: "normal" },
    { id: "battery", label: "Battery Health", status: "normal" },
    { id: "conn", label: "Connectivity", status: "normal" },
    { id: "current", label: "Over Current", status: "normal" },
  ]);

  useEffect(() => {
    const socket = io(BACKEND_URL);

    socket.on("live_telemetry_update", (data) => {
      // If array, grab the first panel's data
      const reading = Array.isArray(data) ? data[0] : data;

      // 2. Logic to map raw telemetry to status indicators
      setStatuses([
        {
          id: "heat",
          label: "Over Heat Protection",
          status: parseFloat(reading.temperature) > 45 ? "critical" : "normal",
        },
        {
          id: "battery",
          label: "Battery Health",
          status: reading.battery_percentage < 20 ? "warning" : "normal",
        },
        {
          id: "conn",
          label: "Connectivity",
          status: reading.connectivity_status === 1 ? "active" : "critical",
        },
        {
          id: "current",
          label: "Over Current",
          status: reading.running_current > 150 ? "critical" : "normal",
        },
      ]);
    });

    return () => socket.disconnect();
  }, []);

  const getStatusClass = (status: string) => {
    switch (status) {
      case "critical":
        return "status-critical";
      case "warning":
        return "status-warning";
      case "active":
        return "status-active";
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
