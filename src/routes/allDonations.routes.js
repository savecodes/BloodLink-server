import { Router } from "express";
import { getAllDonations } from "../controllers/donation.controller.js";
import { verifyFbToken } from "../middlewares/verifyFbToken.js";
import { verifyVolunteer } from "../middlewares/verifyRole.js";

const router = Router();

// Volunteer/Admin — GET /all-donations (with filter + pagination + search)
router.get("/", verifyFbToken, verifyVolunteer, getAllDonations);

export default router;
