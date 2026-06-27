import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./db.js";
//import { downloadDatFile, parseDatFile } from "./helpers/ftpHelper.js";
import Reading from "./models/Readings.js";
import fakeDataRoutes from "./routes/fakedataRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import { startTelemetrySimulation } from "./helpers/liveDataSimulator.js";
import { Server } from "socket.io";
import http from "http";
import aiRoutes from "./routes/aiRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allows any frontend to connect (you can restrict this later)
    methods: ["GET", "POST"],
  },
});

app.use(cors());

app.use(express.json());

app.use("/api/fakedataRoutes", fakeDataRoutes);
app.use("/api/historyRoutes", historyRoutes);
app.use("/api/ai", aiRoutes);

io.on("connection", (socket) => {
  console.log(`🔌 Dashboard Client Connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`🔌 Client Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

//   Start Server + DB Connect

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // 1. Connect Database
  await connectDB();

  // 2. Start pumping out live data!
  startTelemetrySimulation(io);
});
/*
app.get("/api/machines/latest", async (req, res) => {
  try {
    const filePath = await downloadDatFile("solar_panel_6.dat");
    const parsedData = parseDatFile(filePath);
    const newReading = new Reading(parsedData);
    await newReading.save();
    res.json(parsedData);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch and parse .dat file" });
  }
});
*/
