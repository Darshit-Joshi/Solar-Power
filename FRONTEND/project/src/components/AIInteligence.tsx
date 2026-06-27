import React, { useEffect, useMemo, useState } from "react";
import "./AIInteligence.css";

type AnomalyRow = { timestamp: string; is_anomaly: number };
type ForecastResp = { timestamp: string; predicted_battery_pct: number };

type HealthResp = {
  status: "good" | "warning" | "critical";
  color: "green" | "yellow" | "red";
  summary: string;
  last_seen: string | null;
  metrics: {
    battery_percentage?: number;
    temperature?: number;
    motor_speed?: number;
    connectivity_status?: number;
    error_code?: number;
  };
};

const ML_BASE =
  (import.meta as any).env?.VITE_ML_BASE || "http://localhost:8000";
const BACKEND_URL =
  (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:5000";

function useLiveML() {
  const [loading, setLoading] = useState(true);
  const [anomaly, setAnomaly] = useState<AnomalyRow[]>([]);
  const [forecast, setForecast] = useState<ForecastResp | null>(null);
  const [health, setHealth] = useState<HealthResp | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNow = async () => {
    setLoading(true);
    try {
      const [aRes, fRes, hRes] = await Promise.all([
        fetch(`${ML_BASE}/api/predict/anomaly`).catch(() => null),
        fetch(`${ML_BASE}/api/predict/forecast`).catch(() => null),
        fetch(`${ML_BASE}/api/health`).catch(() => null),
      ]);

      // --- DEMO FALLBACK MODE ---
      // If the Python ML backend is offline, we inject realistic dummy data
      // so the dashboard still looks functional and you can test the GenAI feature.
      if (!aRes?.ok || !hRes?.ok) {
        console.warn("⚠️ Python ML Server offline. Using Demo ML Data.");

        setAnomaly([
          {
            timestamp: new Date(Date.now() - 60000).toISOString(),
            is_anomaly: 1,
          },
          {
            timestamp: new Date(Date.now() - 30000).toISOString(),
            is_anomaly: 1,
          },
          {
            timestamp: new Date(Date.now() - 15000).toISOString(),
            is_anomaly: -1,
          }, // ⚠️ Simulated Anomaly
          { timestamp: new Date().toISOString(), is_anomaly: 1 },
        ]);

        setForecast({
          timestamp: new Date().toISOString(),
          predicted_battery_pct: 72,
        });

        setHealth({
          status: "warning",
          color: "yellow",
          summary:
            "(Demo Mode) Sub-optimal throughput detected. Voltage variance aligns with partial shading or dust accumulation.",
          last_seen: new Date().toISOString(),
          metrics: {
            battery_percentage: 76,
            temperature: 42.5,
            motor_speed: 1350,
            connectivity_status: 1,
            error_code: 0,
          },
        });
      } else {
        // If Python is online, use the real ML data
        const aJson = await aRes.json();
        const fJson = await fRes?.json();
        const hJson = await hRes.json();

        setAnomaly(aJson as AnomalyRow[]);
        setForecast(fJson as ForecastResp | null);
        setHealth(hJson as HealthResp | null);
      }

      setLastUpdated(new Date());
    } catch (e) {
      console.error("ML fetch failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNow();
  }, []);

  return { loading, anomaly, forecast, health, lastUpdated, refresh: fetchNow };
}

const AIInteligence: React.FC = () => {
  const { loading, anomaly, forecast, health, lastUpdated, refresh } =
    useLiveML();

  // --- GenAI State ---
  const [aiDiagnostic, setAiDiagnostic] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const latestAnomaly = useMemo(() => {
    if (!anomaly?.length) return null;
    const last = anomaly[anomaly.length - 1];
    return last.is_anomaly === -1 ? "⚠️ Anomaly Detected" : "✅ Normal";
  }, [anomaly]);

  // --- Ask Groq/Gemini for insights ---
  const handleGenerateDiagnostic = async () => {
    if (!health) {
      setAiDiagnostic("Cannot generate report: No telemetry data available.");
      return;
    }

    setIsGenerating(true);
    setAiDiagnostic(null); // Clear previous output

    try {
      // NOTE: Make sure this route matches the one you created in your Node.js backend
      const response = await fetch(`${BACKEND_URL}/api/ai/diagnostic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          healthStatus: health.status,
          metrics: health.metrics,
          recentAnomaly: latestAnomaly,
        }),
      });

      if (!response.ok) throw new Error("Server returned an error");

      const data = await response.json();
      setAiDiagnostic(data.recommendation);
    } catch (error) {
      console.error("Failed to generate AI diagnostic", error);
      setAiDiagnostic(
        "❌ Error: Failed to connect to the GenAI backend service. Make sure your Node server is running and the /api/ai/diagnostic route exists.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // UI Theme Logic
  const healthBg =
    health?.color === "red"
      ? "#fef2f2"
      : health?.color === "yellow"
        ? "#fff7ed"
        : health?.color === "green"
          ? "#ecfdf5"
          : "#f8fafc";
  const healthBorder =
    health?.color === "red"
      ? "#fecaca"
      : health?.color === "yellow"
        ? "#fed7aa"
        : health?.color === "green"
          ? "#bbf7d0"
          : "#e5e7eb";
  const healthText =
    health?.color === "red"
      ? "#7f1d1d"
      : health?.color === "yellow"
        ? "#7c2d12"
        : health?.color === "green"
          ? "#065f46"
          : "#334155";

  return (
    <div className="ai-container">
      <h1 className="ai-page-title">AI INTELLIGENCE</h1>
      <p className="ai-subtitle">ML‑powered insights & GenAI Diagnostics.</p>

      <div
        className="ai-actions"
        style={{ marginBottom: 12, display: "flex", gap: "10px" }}
      >
        <button
          className="btn btn-primary"
          onClick={refresh}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh ML Data"}
        </button>
        {lastUpdated && (
          <span className="ai-chip" style={{ alignSelf: "center" }}>
            Last updated: {lastUpdated.toLocaleString()}
          </span>
        )}
      </div>

      <div className="ai-grid" style={{ marginTop: 10 }}>
        {/* --- GenAI Smart Diagnostic Panel --- */}
        <div
          className="ai-card"
          style={{
            gridColumn: "1 / -1",
            border: "2px solid #8b5cf6",
            background: "#f5f3ff",
          }}
        >
          <h3 style={{ color: "#6d28d9", marginTop: 0 }}>
            ✨ GenAI Chief Engineer Analysis
          </h3>
          <p className="ai-muted" style={{ marginBottom: "15px" }}>
            Use Large Language Models to interpret the current machine learning
            telemetry.
          </p>

          <button
            className="btn"
            style={{
              background: !health || isGenerating ? "#c4b5fd" : "#8b5cf6",
              color: "white",
              marginBottom: "15px",
              cursor: !health || isGenerating ? "not-allowed" : "pointer",
              border: "none",
              padding: "10px 20px",
              borderRadius: "5px",
              fontWeight: "bold",
            }}
            onClick={handleGenerateDiagnostic}
            disabled={isGenerating || !health}
          >
            {isGenerating
              ? "Analyzing Telemetry..."
              : "Generate LLM Diagnostic Report"}
          </button>

          {!health && !loading && (
            <p style={{ color: "#ef4444", fontSize: "0.9em" }}>
              * Cannot generate report: Waiting for telemetry data from ML
              backend.
            </p>
          )}

          {aiDiagnostic && (
            <div
              style={{
                padding: "15px",
                background: "white",
                borderRadius: "8px",
                border: "1px solid #ddd",
              }}
            >
              <strong style={{ color: "#6d28d9" }}>
                Expert Recommendation:
              </strong>
              <p style={{ marginTop: "8px", lineHeight: "1.5", color: "#333" }}>
                {aiDiagnostic}
              </p>
            </div>
          )}
        </div>

        {/* --- Battery Forecast Card --- */}
        <div className="ai-card">
          <h3>Battery Forecast</h3>
          {loading ? (
            <p>Loading...</p>
          ) : forecast ? (
            <>
              <p className="ai-meta">
                At {new Date(forecast.timestamp).toLocaleString()}
              </p>
              <div
                className="ai-value"
                style={{
                  fontSize: "2em",
                  fontWeight: "bold",
                  margin: "10px 0",
                }}
              >
                {forecast.predicted_battery_pct}%
              </div>
              <p className="ai-muted">Predicted battery percentage</p>
            </>
          ) : (
            <p className="ai-muted">No forecast available.</p>
          )}
        </div>

        {/* --- Health Score Card --- */}
        <div
          className="ai-card health-card"
          style={{ background: healthBg, border: `1px solid ${healthBorder}` }}
        >
          <div
            className="health-head"
            style={{
              color: healthText,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ margin: 0 }}>Health Score</h3>
            {health && (
              <span
                className={`health-pill`}
                style={{
                  background:
                    health.color === "yellow"
                      ? "#f59e0b"
                      : health.color === "red"
                        ? "#ef4444"
                        : "#10b981",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "12px",
                  fontSize: "0.8em",
                  fontWeight: "bold",
                }}
              >
                {health.status.toUpperCase()}
              </span>
            )}
          </div>

          {loading && !health ? (
            <p>Loading...</p>
          ) : health ? (
            <>
              <p
                className="ai-muted"
                style={{ marginTop: 6, color: healthText }}
              >
                {health.summary}
              </p>

              <div
                className="health-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginTop: "15px",
                }}
              >
                <div
                  className="health-kv"
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <span
                    className="k"
                    style={{ fontSize: "0.85em", color: "#666" }}
                  >
                    Battery %
                  </span>
                  <span className="v" style={{ fontWeight: "bold" }}>
                    {health.metrics.battery_percentage ?? "—"}%
                  </span>
                </div>
                <div
                  className="health-kv"
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <span
                    className="k"
                    style={{ fontSize: "0.85em", color: "#666" }}
                  >
                    Error Code
                  </span>
                  <span className="v" style={{ fontWeight: "bold" }}>
                    {health.metrics.error_code ?? "—"}
                  </span>
                </div>
                <div
                  className="health-kv"
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <span
                    className="k"
                    style={{ fontSize: "0.85em", color: "#666" }}
                  >
                    Connectivity
                  </span>
                  <span className="v" style={{ fontWeight: "bold" }}>
                    {health.metrics.connectivity_status === 0
                      ? "Offline"
                      : health.metrics.connectivity_status === 1
                        ? "Online"
                        : "—"}
                  </span>
                </div>
                <div
                  className="health-kv"
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <span
                    className="k"
                    style={{ fontSize: "0.85em", color: "#666" }}
                  >
                    Temp (°C)
                  </span>
                  <span className="v" style={{ fontWeight: "bold" }}>
                    {health.metrics.temperature ?? "—"}
                  </span>
                </div>
              </div>

              {health.last_seen && (
                <div style={{ marginTop: "15px" }}>
                  <small
                    className="ai-meta"
                    style={{ fontSize: "0.8em", color: "#888" }}
                  >
                    Last data: {new Date(health.last_seen).toLocaleString()}
                  </small>
                </div>
              )}
            </>
          ) : (
            <p className="ai-muted">No health data available.</p>
          )}
        </div>

        {/* --- Anomaly Detection Card --- */}
        <div className="ai-card">
          <h3>Anomaly Detection</h3>
          {loading ? (
            <p>Loading...</p>
          ) : anomaly?.length ? (
            <>
              <div
                className="ai-anomaly-status"
                style={{
                  fontSize: "1.2em",
                  fontWeight: "bold",
                  margin: "10px 0",
                }}
              >
                {latestAnomaly}
              </div>
              <div
                className="ai-anomaly-list"
                style={{ maxHeight: "150px", overflowY: "auto" }}
              >
                {anomaly
                  .slice(-10)
                  .reverse()
                  .map((row, i) => (
                    <div
                      key={i}
                      className="ai-anomaly-item"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "6px 0",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <span style={{ fontSize: "0.85em", color: "#666" }}>
                        {new Date(row.timestamp).toLocaleString()}
                      </span>
                      <span>{row.is_anomaly === -1 ? "⚠️" : "✅"}</span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <p className="ai-muted">No anomaly data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIInteligence;
