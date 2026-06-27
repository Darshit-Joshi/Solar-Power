// src/components/LiveStatus.tsx
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client"; // <-- IMPORT SOCKET.IO
import "./LiveStatus.css";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Chart,
  Plugin,
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
);

const centerTextPlugin: Plugin = {
  id: "centerText",
  afterDraw(chart, _args, pluginOptions) {
    const { ctx, chartArea } = chart as Chart;
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

type Reading = {
  total_runtime: number;
  battery_percentage: number;
  running_current: number;
  avg_current: number;
  motor_speed: number;
  connectivity_status: 0 | 1;
  device_id: number;
  device_state: number;
  fw_version: number;
  temperature: string | number; // Updated to handle number from backend
  humidity: string | number;
  voltage_battery: number;
  voltage_solar_panel: number;
  panel_location: number;
  error_code: number;
  dbg_accel_output: number;
  dbg_gyro_output: number;
  dbg_motor_status_0: number;
  dbg_motor_status_1: number;
  general_status: number;
  timestamp: string;
};

const toPct = (raw: number) =>
  Math.round(Math.max(0, Math.min(100, (Number(raw) / 255) * 100)));

const BACKEND_URL =
  (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:5000";

const LiveStatus: React.FC = () => {
  const [data, setData] = useState<Reading | null>(null);

  const temperatureRef = useRef<HTMLCanvasElement>(null);
  const batteryRef = useRef<HTMLCanvasElement>(null);
  const curref = useRef<HTMLCanvasElement>(null);

  const charts = useRef<{ temp?: Chart; battery?: Chart; lora?: Chart }>({});

  // ---- NEW: WebSocket Connection for Real-Time Telemetry ----
  useEffect(() => {
    // Connect to the Node.js WebSocket server
    const socket = io(BACKEND_URL);

    // Listen for the live data stream we created in liveDataSimulator.js
    socket.on("live_telemetry_update", (incomingData) => {
      // If the backend sends an array of devices, we grab the first one to display
      // If it sends a single object, we just use it directly
      const latestReading = Array.isArray(incomingData)
        ? incomingData[0]
        : incomingData;
      setData(latestReading);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  // ---- Init / Update charts when data loads ----
  useEffect(() => {
    if (!data) return;

    // Temperature Thermometer Chart
    if (charts.current["temp"]) {
      charts.current["temp"]!.data.datasets[0].data = [
        parseFloat(data.temperature.toString()),
      ];
      charts.current["temp"]!.update();
    } else if (temperatureRef.current) {
      const ctx = temperatureRef.current.getContext("2d")!;
      const gradient = ctx.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, "#e74c3c"); // red (hot)
      gradient.addColorStop(1, "#3498db"); // blue (cold)

      charts.current["temp"] = new ChartJS(temperatureRef.current, {
        type: "bar",
        data: {
          labels: [""],
          datasets: [
            {
              label: "Temperature (°C)",
              data: [parseFloat(data.temperature.toString())],
              backgroundColor: gradient,
              borderRadius: 8,
              barThickness: 60,
            },
          ],
        },
        options: {
          indexAxis: "y", // vertical bar
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 800,
            easing: "easeOutCubic",
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.parsed.x} °C`,
              },
            },
          },
          scales: {
            x: {
              min: 0,
              max: 50,
              ticks: {
                stepSize: 10,
                callback: (val) => `${val}°`,
              },
            },
            y: {
              display: false,
            },
          },
        },
      });
    }

    const createOrUpdateChart = (
      key: keyof typeof charts.current,
      ref: React.RefObject<HTMLCanvasElement>,
      type: "line" | "doughnut",
      labels: string[],
      values: number[],
      colors: string[],
      centerText?: string,
    ) => {
      if (!ref.current) return;

      if (charts.current[key]) {
        const chart = charts.current[key]!;
        (chart.data.datasets[0].data as number[]) = values;
        // @ts-ignore update center text
        chart.options.plugins = {
          ...(chart.options.plugins || {}),
          legend: { display: false },
          centerText: { text: centerText || "" },
        };
        chart.update();
        return;
      }

      charts.current[key] = new ChartJS(ref.current, {
        type,
        data: {
          labels,
          datasets: [
            {
              data: values,
              borderColor: colors[0],
              backgroundColor: type === "doughnut" ? colors : colors[0],
              fill: type === "line",
              tension: type === "line" ? 0.35 : 0,
              borderWidth: type === "line" ? 3 : 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: 0 },
          plugins: {
            legend: { display: false },
            // @ts-ignore custom plugin text
            centerText: { text: centerText || "" },
            tooltip: { enabled: true },
          },
          cutout: type === "doughnut" ? "70%" : undefined,
          scales:
            type === "line"
              ? {
                  x: { grid: { display: false } },
                  y: { grid: { color: "rgba(0,0,0,0.06)" } },
                }
              : undefined,
        },
      });
    };

    // Chart 3: Avg vs Running Current (Bar Chart)
    if (charts.current["lora"]) {
      const chart = charts.current["lora"]!;
      chart.data.datasets[0].data = [data.avg_current, data.running_current];
      chart.update();
    } else if (curref.current) {
      charts.current["lora"] = new ChartJS(curref.current, {
        type: "bar",
        data: {
          labels: ["Average Current", "Running Current"],
          datasets: [
            {
              label: "Current (mA)",
              data: [data.avg_current, data.running_current],
              backgroundColor: ["#8e44ad", "#27ae60"],
              borderRadius: 10,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 800,
            easing: "easeOutQuart",
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} mA`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 10,
              },
            },
          },
        },
      });
    }

    // BATTERY CHART
    // If your backend is already sending a 0-100 percentage, you can use data.battery_percentage directly.
    // If it's 0-255, keep using the toPct function.
    const batt =
      data.battery_percentage > 100
        ? toPct(data.battery_percentage)
        : Math.round(data.battery_percentage);

    createOrUpdateChart(
      "battery",
      batteryRef,
      "doughnut",
      ["Battery", "Remaining"],
      [batt, 100 - batt],
      ["#3498db", "#ecf0f1"],
      `${batt}%`,
    );
  }, [data]);

  if (!data)
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>📡 Connecting to live hardware telemetry stream...</p>
      </div>
    );

  const batteryPct =
    data.battery_percentage > 100
      ? toPct(data.battery_percentage)
      : Math.round(data.battery_percentage);

  return (
    <div className="live-status fade-in">
      <div className="page-head">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h2>Live Status</h2>
          {/* A cool little pulsing red dot to show the data is live */}
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
          Real-time monitoring of system parameters and performance metrics.
        </p>
      </div>

      {/* KPI cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Runtime</span>
          <span className="kpi-value">{data.total_runtime} min</span>
          <span className="kpi-trend up">+2.4%</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Battery %</span>
          <span className="kpi-value">{batteryPct}%</span>
          <span className="kpi-trend ok">Stable</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Current (mA)</span>
          <span className="kpi-value">{data.running_current}</span>
          <span className="kpi-trend down">-15%</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Motor Speed</span>
          <span className="kpi-value">
            {Number(data.motor_speed).toFixed(2)}
          </span>
          <span className="kpi-trend ok">Nominal</span>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">Temperature</div>
          <div className="chart-body">
            <canvas ref={temperatureRef} className="chart-canvas" />
          </div>
        </div>

        <div className="chart-card doughnut">
          <div className="chart-title">Battery</div>
          <div className="chart-body">
            <canvas ref={batteryRef} className="chart-canvas" />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">Average current v/s Running</div>
          <div className="chart-body">
            <canvas ref={curref} className="chart-canvas" />
          </div>
        </div>
      </div>

      {/* System Parameters table */}
      <div className="report-section full-width data-section">
        <h3>System Parameters</h3>
        <table className="data-table">
          <tbody>
            <tr id="Device ID">
              <td>Device ID</td>
              <td>{data.device_id}</td>
            </tr>
            <tr id="Device State">
              <td>Device State</td>
              <td>{data.device_state}</td>
            </tr>
            <tr id="FW Version">
              <td>FW Version</td>
              <td>{data.fw_version}</td>
            </tr>
            <tr id="Temperature">
              <td>Temperature</td>
              <td>{data.temperature} °C</td>
            </tr>
            <tr id="Humidity">
              <td>Humidity</td>
              <td>{data.humidity} %</td>
            </tr>
            <tr id="Voltage Battery">
              <td>Voltage Battery</td>
              <td>{data.voltage_battery} mV</td>
            </tr>
            <tr id="Voltage Solar Panel">
              <td>Voltage Solar Panel</td>
              <td>{data.voltage_solar_panel} mV</td>
            </tr>
            <tr id="Running Current">
              <td>Running Current</td>
              <td>{data.running_current} mA</td>
            </tr>
            <tr id="Average Current">
              <td>Average Current</td>
              <td>{data.avg_current} mA</td>
            </tr>
            <tr id="Motor Speed">
              <td>Motor Speed</td>
              <td>{data.motor_speed}</td>
            </tr>
            <tr id="Panel Location">
              <td>Panel Location</td>
              <td>{data.panel_location}</td>
            </tr>
            <tr id="Battery">
              <td>Battery</td>
              <td>{batteryPct} %</td>
            </tr>
            <tr id="Connectivity Status">
              <td>Connectivity Status</td>
              <td>{data.connectivity_status === 1 ? "Online" : "Offline"}</td>
            </tr>
            <tr id="Total Runtime">
              <td>Total Runtime</td>
              <td>{data.total_runtime} min</td>
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

export default LiveStatus;
