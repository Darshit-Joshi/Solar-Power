// BACKEND/controllers/aiController.js
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

// Initialize the Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// We'll use LLaMA 3 8B, which is incredibly fast on Groq
const MODEL_NAME = "llama-3.1-8b-instant";

// 1. Controller for the "AI Intelligence" Dashboard
export const generateDiagnostic = async (req, res) => {
  try {
    const { healthStatus, metrics, recentAnomaly } = req.body;

    const prompt = `
        You are a Chief AI Engineer for an industrial Solar Plant Monitoring System. 
        Analyze the following real-time telemetry data and provide a concise, professional 2-3 sentence diagnostic recommendation. 
        
        System State: ${healthStatus?.toUpperCase() || "UNKNOWN"}
        Battery: ${metrics?.battery_percentage || "N/A"}%
        Temperature: ${metrics?.temperature || "N/A"}°C
        Motor Speed: ${metrics?.motor_speed || "N/A"} RPM
        Connectivity: ${metrics?.connectivity_status === 1 ? "Online" : "Offline"}
        Error Code: ${metrics?.error_code || "None"}
        Recent Anomaly Status: ${recentAnomaly || "Normal"}
        
        Provide actionable advice based ONLY on these metrics. Do not use markdown formatting like bolding or asterisks. Keep it strictly to the point.
        `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: MODEL_NAME,
      temperature: 0.2, // Low temperature for more analytical/factual responses
    });

    const recommendation =
      chatCompletion.choices[0]?.message?.content ||
      "No recommendation generated.";

    res.json({ recommendation });
  } catch (error) {
    console.error("Groq Diagnostic Error:", error);
    res.status(500).json({ error: "Failed to generate AI diagnostic." });
  }
};

// 2. Controller for the "Alerts" Troubleshooting Guide
export const troubleshootAlert = async (req, res) => {
  try {
    const { alertTitle, description } = req.body;

    const prompt = `
        You are an expert Solar Plant Maintenance Technician. 
        A system alert has been triggered.
        
        Alert Title: ${alertTitle}
        Description: ${description}
        
        Provide a fast, step-by-step troubleshooting guide (maximum 3 steps) to resolve this specific issue. Keep it highly technical but brief. Do not use asterisks or markdown bolding.
        `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: MODEL_NAME,
      temperature: 0.1,
    });

    const guide =
      chatCompletion.choices[0]?.message?.content || "No guide generated.";

    res.json({ guide });
  } catch (error) {
    console.error("Groq Troubleshoot Error:", error);
    res
      .status(500)
      .json({ error: "Failed to generate AI troubleshooting guide." });
  }
};
