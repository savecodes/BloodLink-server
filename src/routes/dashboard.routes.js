import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import { verifyFbToken } from "../middlewares/verifyFbToken.js";
import { verifyVolunteer } from "../middlewares/verifyRole.js";

const router = Router();

// Volunteer/Admin — aggregated stats for the admin dashboard
router.get("/stats", verifyFbToken, verifyVolunteer, getDashboardStats);

export default router;
