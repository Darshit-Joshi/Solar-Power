// BACKEND/routes/aiRoutes.js
import express from "express";
import {
  generateDiagnostic,
  troubleshootAlert,
} from "../controllers/aiController.js";

const router = express.Router();

router.post("/diagnostic", generateDiagnostic);
router.post("/troubleshoot", troubleshootAlert);

export default router;
