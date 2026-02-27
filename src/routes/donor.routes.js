import { Router } from "express";
import { searchDonors } from "../controllers/donor.controller.js";

const router = Router();

// Public — search for available donors by blood group, district, upazila
router.get("/search", searchDonors);

export default router;
