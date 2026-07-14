// src/components/Alerts.tsx
import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Zap,
  Shield,
  Battery,
  Cpu,
  Info,
} from "lucide-react";
import { io } from "socket.io-client";
import "./Alerts.css";

interface SystemAlert {
  id: string | number;
  title: string;
  status: "normal" | "active" | "pending" | "triggered" | "resolved";
  description: string;
  lastUpdate: string;
  priority: "normal" | "high" | "critical";
  type: "maintenance" | "sensor" | "temperature" | "power" | "battery";
  location?: string;
  panel_id?: string;
}

const BACKEND_URL =
  (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:5000";

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [aiDiagnostic, setAiDiagnostic] = useState<{
    id: string | number;
    text: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- NEW: State to track which alert's details are currently open ---
  const [expandedAlertId, setExpandedAlertId] = useState<
    string | number | null
  >(null);

  useEffect(() => {
    setAlerts([
      {
        id: 1,
        title: "Maintenance Needs",
        status: "pending",
        description: "Scheduled maintenance required",
        lastUpdate: "2025-08-15",
        priority: "high",
        type: "maintenance",
        location: "Zone A - Main Array",
      },
      {
        id: 2,
        title: "Rain Sensor",
        status: "active",
        description: "Rain detection system operational",
        lastUpdate: "2025-07-19 14:30",
        priority: "normal",
        type: "sensor",
        location: "Zone B - West Wing",
      },
      {
        id: 3,
        title: "Position Sensors",
        status: "normal",
        description: "All position sensors calibrated",
        lastUpdate: "2025-06-30",
        priority: "normal",
        type: "sensor",
        location: "Zone A - Main Array",
      },
      {
        id: 4,
        title: "Over Heat Protection",
        status: "triggered",
        description: "Temperature threshold exceeded",
        lastUpdate: "2025-07-18 11:20",
        priority: "critical",
        type: "temperature",
        location: "solar_panel_6",
      },
      {
        id: 5,
        title: "Over Current Protection",
        status: "normal",
        description: "Current levels within safe limits",
        lastUpdate: "No recent events",
        priority: "normal",
        type: "power",
        location: "Zone C - Substation",
      },
      {
        id: 6,
        title: "Deep Discharge Protection",
        status: "normal",
        description: "Battery voltage stable",
        lastUpdate: "Monitoring continuous",
        priority: "normal",
        type: "battery",
        location: "Battery Storage Unit #1",
      },
    ]);

    const socket = io(BACKEND_URL);

    // FIX: Safely handle both single alert objects AND arrays of batch alerts
    socket.on("live_alert", (newAlertData: SystemAlert | SystemAlert[]) => {
      const incomingAlerts = Array.isArray(newAlertData)
        ? newAlertData
        : [newAlertData];

      setAlerts((prevAlerts) => {
        // Prevent duplicate IDs from flooding the list
        const existingIds = new Set(prevAlerts.map((a) => a.id));
        const uniqueNew = incomingAlerts.filter((a) => !existingIds.has(a.id));
        return [...uniqueNew, ...prevAlerts];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleAITroubleshoot = async (alert: SystemAlert) => {
    setIsGenerating(true);
    setAiDiagnostic(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/troubleshoot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertTitle: alert.title,
          description: alert.description,
        }),
      });

      if (!response.ok) throw new Error("Server error");

      const data = await response.json();
      setAiDiagnostic({ id: alert.id, text: data.guide });

      // Auto-expand the details panel so the user can see the AI output clearly
      setExpandedAlertId(alert.id);
    } catch (error) {
      console.error("AI Generation failed", error);
      setAiDiagnostic({
        id: alert.id,
        text: "❌ Error: Could not generate troubleshooting guide. Ensure backend is running.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleDetails = (id: string | number) => {
    setExpandedAlertId(expandedAlertId === id ? null : id);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "maintenance":
        return <AlertTriangle size={24} />;
      case "sensor":
        return <CheckCircle size={24} />;
      case "temperature":
        return <Zap size={24} />;
      case "power":
        return <Shield size={24} />;
      case "battery":
        return <Battery size={24} />;
      default:
        return <AlertTriangle size={24} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
      case "resolved":
        return "#27ae60";
      case "active":
        return "#3498db";
      case "pending":
        return "#f39c12";
      case "triggered":
        return "#e74c3c";
      default:
        return "#95a5a6";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "#e74c3c";
      case "high":
        return "#e67e22";
      case "normal":
        return "#27ae60";
      default:
        return "#95a5a6";
    }
  };

  const criticalCount = alerts.filter((a) => a.priority === "critical").length;
  const highCount = alerts.filter((a) => a.priority === "high").length;
  const normalCount = alerts.filter((a) => a.priority === "normal").length;

  return (
    <div className="alerts fade-in">
      <h2>System Alerts & AI Diagnostics</h2>
      <p>
        Monitor protection systems and utilize Groq LLM for instant
        troubleshooting steps.
      </p>

      <div className="alerts-summary">
        <div className="summary-item critical">
          <div className="summary-number">{criticalCount}</div>
          <div className="summary-label">Critical</div>
        </div>
        <div className="summary-item high">
          <div className="summary-number">{highCount}</div>
          <div className="summary-label">High Priority</div>
        </div>
        <div className="summary-item normal">
          <div className="summary-number">{normalCount}</div>
          <div className="summary-label">Normal</div>
        </div>
      </div>

      <div className="alerts-grid">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="alert-card"
            style={
              alert.priority === "critical"
                ? { border: "1px solid #e74c3c" }
                : {}
            }
          >
            <div className="alert-header">
              <div
                className="alert-icon"
                style={{ color: getStatusColor(alert.status) }}
              >
                {getIcon(alert.type)}
              </div>
              <div
                className="alert-priority"
                style={{ backgroundColor: getPriorityColor(alert.priority) }}
              >
                {alert.priority}
              </div>
            </div>

            <div className="alert-content">
              <h3>{alert.title}</h3>
              <p>{alert.description}</p>

              <div className="alert-details">
                <div className="alert-status">
                  <span className="status-label">Status:</span>
                  <span
                    className="status-value"
                    style={{
                      color: getStatusColor(alert.status),
                      fontWeight: "bold",
                    }}
                  >
                    {alert.status.charAt(0).toUpperCase() +
                      alert.status.slice(1)}
                  </span>
                </div>

                <div className="alert-timestamp">
                  <span className="timestamp-label">Last Update:</span>
                  <span className="timestamp-value">{alert.lastUpdate}</span>
                </div>
              </div>

              {/* --- NEW: Expanded Details Panel --- */}
              {expandedAlertId === alert.id && (
                <div
                  className="expanded-details-panel fade-in"
                  style={{
                    marginTop: "15px",
                    paddingTop: "15px",
                    borderTop: "1px solid #eee",
                  }}
                >
                  <h4
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      margin: "0 0 10px 0",
                      color: "#555",
                    }}
                  >
                    <Info size={16} /> System Metadata
                  </h4>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "20px",
                      fontSize: "0.9em",
                      color: "#666",
                    }}
                  >
                    <li>
                      <strong>Event ID:</strong> EVT-SYS-{alert.id}-
                      {Date.now().toString().slice(-6)}
                    </li>
                    <li>
                      <strong>Log Source:</strong> Main Telemetry Gateway
                    </li>
                    <li>
                      <strong>Severity Index:</strong>{" "}
                      {alert.priority === "critical"
                        ? "9.8"
                        : alert.priority === "high"
                          ? "6.4"
                          : "1.2"}
                    </li>
                  </ul>

                  {/* Move AI Output into the details panel for a cleaner UI */}
                  {aiDiagnostic?.id === alert.id && (
                    <div
                      style={{
                        marginTop: "15px",
                        padding: "12px",
                        background: "#f5f3ff",
                        borderRadius: "6px",
                        borderLeft: "4px solid #8b5cf6",
                      }}
                    >
                      <strong
                        style={{
                          color: "#6d28d9",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          marginBottom: "8px",
                        }}
                      >
                        <Cpu size={18} /> Groq AI Maintenance Guide:
                      </strong>
                      <p
                        style={{
                          margin: 0,
                          color: "#333",
                          whiteSpace: "pre-line",
                          lineHeight: "1.4",
                        }}
                      >
                        {aiDiagnostic.text}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              className="alert-actions"
              style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
            >
              {(alert.status === "triggered" || alert.status === "pending") && (
                <button className="btn btn-primary">Acknowledge</button>
              )}

              {/* --- FIXED: Wired up the onClick event --- */}
              <button
                className="btn btn-secondary"
                onClick={() => toggleDetails(alert.id)}
              >
                {expandedAlertId === alert.id ? "Hide Details" : "View Details"}
              </button>

              {(alert.priority === "critical" || alert.priority === "high") && (
                <button
                  className="btn"
                  style={{
                    background:
                      isGenerating && aiDiagnostic?.id === alert.id
                        ? "#c4b5fd"
                        : "#8b5cf6",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    border: "none",
                    cursor: isGenerating ? "not-allowed" : "pointer",
                  }}
                  onClick={() => handleAITroubleshoot(alert)}
                  disabled={isGenerating}
                >
                  <Cpu size={16} />
                  {isGenerating && aiDiagnostic?.id !== alert.id
                    ? "AI Busy..."
                    : isGenerating && aiDiagnostic?.id === alert.id
                      ? "Analyzing..."
                      : "AI Troubleshoot"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ... Rest of your History Table remains identical ... */}
    </div>
  );
};

export default Alerts;
