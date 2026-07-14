// BACKEND/routes/aiRoutes.js
import express from "express";
import {
  predictStatus,
  predictAnomalyBatch,
  predictForecast,
  generateDiagnostic,
  troubleshootAlert,
} from "../controllers/aiController.js";

const router = express.Router();

router.post("/predict/status", predictStatus);
router.post("/predict/anomaly-batch", predictAnomalyBatch);
router.post("/predict/forecast", predictForecast);
router.post("/diagnostic", generateDiagnostic);
router.post("/troubleshoot", troubleshootAlert);

export default router;
