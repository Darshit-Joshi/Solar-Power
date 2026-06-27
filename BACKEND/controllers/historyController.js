import Reading from "../models/Readings.js";

export const getHistory = async (_req, res) => {
  try {
    const readings = await Reading.find().sort({ timestamp: -1 });
    res.json(readings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch readings history" });
  }
};

export const getHistoricalData = async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Fetch data from last 24 hours
    const data = await Reading.find({
      timestamp: { $gte: twentyFourHoursAgo },
    }).sort({ timestamp: 1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
};
