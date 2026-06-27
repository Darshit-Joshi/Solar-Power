// src/components/Reports.tsx
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./Reports.css";
import { Chart as ChartJS, registerables, Plugin } from "chart.js";

ChartJS.register(...registerables);

// Re-registering the custom plugin so the Error Code Doughnut has center text
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
  (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:5000";

const Reports: React.FC = () => {
  const [data, setData] = useState<any>(null);

  const runtimeChartRef = useRef<HTMLCanvasElement>(null);
  const accelGyroChartRef = useRef<HTMLCanvasElement>(null);
  const errorCodeChartRef = useRef<HTMLCanvasElement>(null);

  // Use a ref to hold chart instances so we can update them instead of destroying them
  const chartsRef = useRef<{ [key: string]: ChartJS }>({});

  // 1. WebSocket Connection for Real-Time Telemetry
  useEffect(() => {
    const socket = io(BACKEND_URL);

    socket.on("live_telemetry_update", (incomingData) => {
      // Handle array or single object just like LiveStatus
      const latestReading = Array.isArray(incomingData)
        ? incomingData[0]
        : incomingData;
      setData(latestReading);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 2. Smooth Chart Updating Logic
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
              label: "Runtime",
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
          animation: { duration: 800, easing: "easeOutQuart" },
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
              label: "Debug",
              data: [data.dbg_accel_output, data.dbg_gyro_output],
              backgroundColor: ["#3498db", "#9b59b6"],
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 800, easing: "easeOutQuart" },
        },
      });
    }

    // --- Error Code Chart ---
    // Make sure we never divide by zero or break the chart with bad data
    const errorVal = data.error_code || 0;
    const okVal = errorVal === 0 ? 1 : 0; // If no error, 100% OK green ring

    if (chartsRef.current["error"]) {
      chartsRef.current["error"].data.datasets[0].data = [errorVal, okVal];

      // Update the center text plugin dynamically
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
            tooltip: { enabled: true },
            // @ts-ignore custom plugin
            centerText: { text: `${errorVal}` },
          },
        },
      });
    }
  }, [data]);

  if (!data)
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>📡 Connecting to live reports stream...</p>
      </div>
    );

  return (
    <div className="reports fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <h2>Reports</h2>
        {/* Live sync indicator to match the rest of your dashboard */}
        <div
          style={{
            width: "10px",
            height: "10px",
            background: "#e74c3c",
            borderRadius: "50%",
            animation: "pulse 1.5s infinite",
          }}
        />
      </div>
      <p>
        Real-time visual insights into runtime, error codes, and sensor outputs
        from continuous operations.
      </p>

      <div className="reports-grid">
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
          <div className="chart-title">Error Code</div>
          <div className="chart-container">
            <canvas ref={errorCodeChartRef}></canvas>
          </div>
        </div>
      </div>

      <div className="report-section full-width">
        <h3>Performance Metrics</h3>
        <table className="data-table">
          <tbody>
            <tr id="Error Code">
              <td>Error Code</td>
              <td>{data.error_code}</td>
            </tr>
            <tr id="Total Runtime">
              <td>Total Runtime</td>
              <td>{data.total_runtime}</td>
            </tr>
            <tr id="DBG Accel Output">
              <td>DBG Accel Output</td>
              <td>{data.dbg_accel_output}</td>
            </tr>
            <tr id="DBG Gyro Output">
              <td>DBG Gyro Output</td>
              <td>{data.dbg_gyro_output}</td>
            </tr>
            <tr id="DBG Motor Status 0">
              <td>DBG Motor Status 0</td>
              <td>{data.dbg_motor_status_0}</td>
            </tr>
            <tr id="DBG Motor Status 1">
              <td>DBG Motor Status 1</td>
              <td>{data.dbg_motor_status_1}</td>
            </tr>
            <tr id="General Status">
              <td>General Status</td>
              <td>{data.general_status}</td>
            </tr>
            <tr id="Time Stamp">
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
