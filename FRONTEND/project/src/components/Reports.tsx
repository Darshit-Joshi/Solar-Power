import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./Reports.css";
import { Chart as ChartJS, registerables, Plugin } from "chart.js";

ChartJS.register(...registerables);

// Custom plugin for Doughnut center text
const centerTextPlugin: Plugin = {
  id: "centerText",
  afterDraw(chart, _args, pluginOptions) {
    const { ctx, chartArea } = chart as any;
    if (!chartArea) return;
    const text: string = (pluginOptions as any)?.text ?? "";
    if (!text) return;

    const x = (chartArea.left + chartArea.right) / 2;
    const y = (chartArea.top + chartArea.bottom) / 2;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font =
      "700 22px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillStyle = "#2c3e50";
    ctx.fillText(text, x, y);
    ctx.restore();
  },
};
ChartJS.register(centerTextPlugin);

const BACKEND_URL =
  (import.meta as any).env?.VITE_BACKEND_URL ||
  "https://solar-project-nmcg.onrender.com";

const Reports: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [allPanels, setAllPanels] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  // AI Integration States
  const [forecast, setForecast] = useState<number[]>([]);
  const [aiDiagnostic, setAiDiagnostic] = useState<string>(
    "Click below to generate an AI diagnostic report.",
  );
  const [loadingAi, setLoadingAi] = useState<boolean>(false);

  // Chart Canvas Refs
  const runtimeChartRef = useRef<HTMLCanvasElement>(null);
  const accelGyroChartRef = useRef<HTMLCanvasElement>(null);
  const errorCodeChartRef = useRef<HTMLCanvasElement>(null);
  const forecastChartRef = useRef<HTMLCanvasElement>(null);

  const chartsRef = useRef<{ [key: string]: ChartJS }>({});

  // 1. WebSocket Connection & Dynamic Location Filtering
  useEffect(() => {
    const socket = io(BACKEND_URL);

    socket.on("live_telemetry_update", (incomingData) => {
      const dataArray = Array.isArray(incomingData)
        ? incomingData
        : [incomingData];
      setAllPanels(dataArray);

      // Filter by selected location/panel or default to the first available
      if (selectedLocation === "all" || !selectedLocation) {
        setData(dataArray[0]);
      } else {
        const found = dataArray.find(
          (p) =>
            (p.location || p.panel_id || "Default Zone") === selectedLocation,
        );
        setData(found || dataArray[0]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedLocation]);

  // 2. Fetch AI Power Forecast (ML Engine Integration)
  const fetchAiForecast = async () => {
    if (!data) return;
    try {
      // Build a mockup history payload from current data if historical array isn't cached yet
      const mockHistory = Array.from({ length: 5 }, (_, i) => ({
        timestamp: new Date(Date.now() - (4 - i) * 60000).toISOString(),
        voltage: Number(data.voltage) || 24.0,
        current: Number(data.running_current) || 5.0,
        power:
          (Number(data.voltage) || 24.0) *
          (Number(data.running_current) || 5.0),
        temperature: Number(data.temperature) || 35.0,
        irradiance: 800.0,
      }));

      const response = await fetch(`${BACKEND_URL}/api/ai/predict/forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: mockHistory, steps_ahead: 6 }),
      });
      const resData = await response.json();
      if (resData.forecasted_power) {
        setForecast(resData.forecasted_power);
      }
    } catch (error) {
      console.error("Error fetching ML forecast:", error);
    }
  };

  // 3. Fetch Groq AI Diagnostic Report (LLM Integration)
  const fetchAiDiagnostic = async () => {
    if (!data) return;
    setLoadingAi(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/diagnostic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          healthStatus: data.general_status || "NORMAL",
          metrics: {
            battery_percentage: data.battery_percentage || 100,
            temperature: data.temperature || 30,
            motor_speed: data.motor_speed || 1200,
            connectivity_status: data.connectivity_status ?? 1,
            error_code: data.error_code || 0,
            voltage: data.voltage || 24,
            current: data.running_current || 5,
          },
          recentAnomaly:
            data.temperature > 85 ? "High Temperature Alert" : "None",
        }),
      });
      const resData = await response.json();
      setAiDiagnostic(resData.recommendation || "No insights generated.");
    } catch (error) {
      console.error("Error fetching Groq diagnostic:", error);
      setAiDiagnostic("Failed to communicate with AI diagnostic service.");
    } finally {
      setLoadingAi(false);
    }
  };

  // 4. Chart Rendering & Updating Logic
  useEffect(() => {
    if (!data) return;

    // --- Runtime Chart ---
    if (chartsRef.current["runtime"]) {
      chartsRef.current["runtime"].data.datasets[0].data = [
        data.total_runtime - 5,
        data.total_runtime - 2,
        data.total_runtime,
      ];
      chartsRef.current["runtime"].update();
    } else if (runtimeChartRef.current) {
      chartsRef.current["runtime"] = new ChartJS(runtimeChartRef.current, {
        type: "line",
        data: {
          labels: ["10m", "5m", "Now"],
          datasets: [
            {
              label: "Runtime (hrs)",
              data: [
                data.total_runtime - 5,
                data.total_runtime - 2,
                data.total_runtime,
              ],
              borderColor: "#2ecc71",
              backgroundColor: "rgba(46,204,113,0.2)",
              tension: 0.3,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 800 },
        },
      });
    }

    // --- Accel/Gyro Chart ---
    if (chartsRef.current["accel"]) {
      chartsRef.current["accel"].data.datasets[0].data = [
        data.dbg_accel_output,
        data.dbg_gyro_output,
      ];
      chartsRef.current["accel"].update();
    } else if (accelGyroChartRef.current) {
      chartsRef.current["accel"] = new ChartJS(accelGyroChartRef.current, {
        type: "bar",
        data: {
          labels: ["DBG Accel", "DBG Gyro"],
          datasets: [
            {
              label: "Sensor Output",
              data: [data.dbg_accel_output, data.dbg_gyro_output],
              backgroundColor: ["#3498db", "#9b59b6"],
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 800 },
        },
      });
    }

    // --- Error Code Doughnut Chart ---
    const errorVal = data.error_code || 0;
    const okVal = errorVal === 0 ? 1 : 0;

    if (chartsRef.current["error"]) {
      chartsRef.current["error"].data.datasets[0].data = [errorVal, okVal];
      if (chartsRef.current["error"].options.plugins) {
        (chartsRef.current["error"].options.plugins as any).centerText = {
          text: `${errorVal}`,
        };
      }
      chartsRef.current["error"].update();
    } else if (errorCodeChartRef.current) {
      chartsRef.current["error"] = new ChartJS(errorCodeChartRef.current, {
        type: "doughnut",
        data: {
          labels: ["Error", "OK"],
          datasets: [
            {
              data: [errorVal, okVal],
              backgroundColor: ["#e74c3c", "#2ecc71"],
              cutout: "70%",
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            // @ts-ignore
            centerText: { text: `${errorVal}` },
          },
        },
      });
    }
  }, [data]);

  // 5. Update Forecast Chart when ML prediction changes
  useEffect(() => {
    if (forecast.length === 0) return;
    if (chartsRef.current["forecast"]) {
      chartsRef.current["forecast"].data.datasets[0].data = forecast;
      chartsRef.current["forecast"].update();
    } else if (forecastChartRef.current) {
      chartsRef.current["forecast"] = new ChartJS(forecastChartRef.current, {
        type: "line",
        data: {
          labels: ["+10m", "+20m", "+30m", "+40m", "+50m", "+60m"],
          datasets: [
            {
              label: "Predicted Power Output (Watts)",
              data: forecast,
              borderColor: "#f39c12",
              backgroundColor: "rgba(243,156,18,0.2)",
              borderDash: [5, 5],
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    }
  }, [forecast]);

  if (!data) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#fff" }}>
        <p>📡 Connecting to live reports stream...</p>
      </div>
    );
  }

  // Extract unique locations for the dropdown
  const locations = Array.from(
    new Set(allPanels.map((p) => p.location || p.panel_id || "Default Zone")),
  );

  return (
    <div className="reports fade-in">
      {/* Header with Dynamic Location Selector */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h2>Reports & AI Analytics</h2>
          <div
            style={{
              width: "10px",
              height: "10px",
              background: "#2ecc71",
              borderRadius: "50%",
              animation: "pulse 1.5s infinite",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label htmlFor="location-select" style={{ fontWeight: "bold" }}>
            Site Location:
          </label>
          <select
            id="location-select"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              background: "#fff",
              color: "#333",
              fontWeight: "bold",
            }}
          >
            <option value="all">All Arrays (Default View)</option>
            {locations.map((loc, idx) => (
              <option key={idx} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p style={{ marginTop: "5px", color: "#bbb" }}>
        Showing live diagnostics for:{" "}
        <strong>{data.location || data.panel_id || "Default Zone"}</strong>
      </p>

      {/* Standard Telemetry Grid */}
      <div className="reports-grid" style={{ marginTop: "20px" }}>
        <div className="report-section no-bg">
          <div className="chart-title">Total Runtime</div>
          <div className="chart-container">
            <canvas ref={runtimeChartRef}></canvas>
          </div>
        </div>
        <div className="report-section no-bg">
          <div className="chart-title">DBG Accel + Gyro Output</div>
          <div className="chart-container">
            <canvas ref={accelGyroChartRef}></canvas>
          </div>
        </div>
        <div className="report-section no-bg">
          <div className="chart-title">Error Code Status</div>
          <div className="chart-container">
            <canvas ref={errorCodeChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* AI & ML Integrated Analytics Section */}
      <div
        className="report-section full-width"
        style={{
          marginTop: "20px",
          background: "rgba(255,255,255,0.03)",
          padding: "20px",
          borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <h3>🤖 AI Power Generation Forecast (ML Engine)</h3>
          <button
            onClick={fetchAiForecast}
            style={{
              padding: "8px 16px",
              background: "#f39c12",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Run 6-Step Forecast
          </button>
        </div>
        <p style={{ fontSize: "14px", color: "#aaa", marginBottom: "15px" }}>
          Projects watt generation over the next 60 minutes using rolling
          historical telemetry.
        </p>
        <div className="chart-container" style={{ height: "250px" }}>
          {forecast.length > 0 ? (
            <canvas ref={forecastChartRef}></canvas>
          ) : (
            <div
              style={{
                display: "flex",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                border: "1px dashed #555",
                borderRadius: "8px",
              }}
            >
              <span style={{ color: "#888" }}>
                Click "Run 6-Step Forecast" to generate predictive ML chart
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Groq LLaMA Diagnostic Report */}
      <div
        className="report-section full-width"
        style={{
          marginTop: "20px",
          background: "rgba(255,255,255,0.03)",
          padding: "20px",
          borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <h3>⚡ Groq AI Executive Summary</h3>
          <button
            onClick={fetchAiDiagnostic}
            disabled={loadingAi}
            style={{
              padding: "8px 16px",
              background: "#3498db",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: loadingAi ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            {loadingAi ? "Analyzing Telemetry..." : "Generate AI Report"}
          </button>
        </div>
        <div
          style={{
            marginTop: "15px",
            padding: "15px",
            background: "rgba(0,0,0,0.2)",
            borderRadius: "8px",
            borderLeft: "4px solid #3498db",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              lineHeight: "1.6",
              color: "#fff",
            }}
          >
            {aiDiagnostic}
          </p>
        </div>
      </div>

      {/* Raw Data Table */}
      <div className="report-section full-width" style={{ marginTop: "20px" }}>
        <h3>Active Site Performance Metrics</h3>
        <table className="data-table">
          <tbody>
            <tr>
              <td>Panel ID / Location</td>
              <td>
                <strong>
                  {data.location || data.panel_id || "Default Zone"}
                </strong>
              </td>
            </tr>
            <tr>
              <td>Error Code</td>
              <td>{data.error_code}</td>
            </tr>
            <tr>
              <td>Total Runtime</td>
              <td>{data.total_runtime} hrs</td>
            </tr>
            <tr>
              <td>Voltage / Current</td>
              <td>
                {data.voltage || 24} V / {data.running_current || 0} A
              </td>
            </tr>
            <tr>
              <td>DBG Accel Output</td>
              <td>{data.dbg_accel_output}</td>
            </tr>
            <tr>
              <td>DBG Gyro Output</td>
              <td>{data.dbg_gyro_output}</td>
            </tr>
            <tr>
              <td>General Status</td>
              <td>{data.general_status || "NORMAL"}</td>
            </tr>
            <tr>
              <td>Time Stamp</td>
              <td>{new Date(data.timestamp).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
