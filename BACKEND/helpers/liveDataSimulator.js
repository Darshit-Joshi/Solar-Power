// BACKEND/helpers/liveDataSimulator.js
import Reading from "../models/Readings.js";

// Helper to get 15 min buckets (copied from your code)
function get15MinSlotStart(d = new Date()) {
  const slot = new Date(d);
  slot.setSeconds(0, 0);
  const m = slot.getMinutes();
  const bucket = Math.floor(m / 15) * 15;
  slot.setMinutes(bucket);
  return slot;
}

// Helper to save only if it's a new 15-minute slot
async function saveIfNewSlot(payload) {
  const slotStart = get15MinSlotStart();
  const exists = await Reading.exists({ slotStart });
  if (exists) return { saved: false, slotStart };

  await Reading.create({ ...payload, slotStart, timestamp: new Date() });
  return { saved: true, slotStart };
}

export const startTelemetrySimulation = (io) => {
  console.log("⚡ Starting Live IoT Telemetry Simulator...");

  // Run every 3 seconds (3000ms)
  setInterval(async () => {
    const liveData = {
      device_id: 4132004,
      device_state: Math.floor(Math.random() * 5),
      fw_version: Math.floor(Math.random() * 100),
      temperature: parseFloat((28 + Math.random() * 4).toFixed(2)),
      humidity: parseFloat((65 + Math.random() * 10).toFixed(2)),
      voltage_battery: Math.floor(1100 + Math.random() * 100),
      voltage_solar_panel: Math.floor(2400 + Math.random() * 200),
      running_current: Math.floor(120 + Math.random() * 10),
      avg_current: Math.floor(110 + Math.random() * 15),
      motor_speed: parseFloat((Math.random() * 0.1).toFixed(2)),
      panel_location: Math.floor(10 + Math.random() * 5),
      battery_percentage: Math.floor(Math.random() * 101),
      connectivity_status: Math.floor(Math.random() * 2),
      error_code: Math.floor(Math.random() * 10),
      total_runtime: Math.floor(30 + Math.random() * 20),
      dbg_accel_output: Math.floor(Math.random() * 5000000000),
      dbg_gyro_output: Math.floor(Math.random() * 5000000000),
      dbg_motor_status_0: Math.floor(Math.random() * 2),
      dbg_motor_status_1: Math.floor(Math.random() * 2),
      general_status: Math.floor(Math.random() * 5),
      timestamp: new Date().toISOString(),
    };

    try {
      // 1. Send live data to the React Frontend IMMEDIATELY
      if (io) {
        io.emit("live_telemetry_update", liveData);
      }

      // 2. Try saving to DB (It will only actually save if it's a new 15-min bucket)
      const saveResult = await saveIfNewSlot(liveData);
      if (saveResult.saved) {
        console.log(
          `💾 Saved new 15-min bucket to DB at ${new Date().toLocaleTimeString()}`,
        );
      }
    } catch (err) {
      console.error("❌ Live simulation error:", err);
    }
  }, 3000); // Emits every 3 seconds
};
