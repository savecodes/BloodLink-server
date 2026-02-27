import { Router } from "express";
import {
  getPublicDonations,
  getDonationsByUser,
  getDonationDashboard,
  getDonationById,
  createDonation,
  updateDonation,
  updateDonationStatus,
  deleteDonation,
} from "../controllers/donation.controller.js";
import { verifyFbToken } from "../middlewares/verifyFbToken.js";
import { verifyVolunteer } from "../middlewares/verifyRole.js";
import { verifyOwner } from "../middlewares/verifyOwner.js";

const router = Router();

// Public — GET /donations (pending requests, paginated)
router.get("/", getPublicDonations);

// Protected — GET /donations/user/:email
router.get("/user/:email", verifyFbToken, getDonationsByUser);

// Protected — GET /donations/dashboard/:email
router.get("/dashboard/:email", verifyFbToken, getDonationDashboard);

// Protected — GET /donations/:id
router.get("/:id", verifyFbToken, getDonationById);

// Protected — POST /donations
router.post("/", verifyFbToken, createDonation);

// Protected (owner/admin) — PUT /donations/:id
router.put("/:id", verifyFbToken, verifyOwner, updateDonation);

// Volunteer/Admin — PATCH /donations/:id/status
router.patch("/:id/status", verifyFbToken, verifyVolunteer, updateDonationStatus);

// Protected (owner/admin) — DELETE /donations/:id
router.delete("/:id", verifyFbToken, verifyOwner, deleteDonation);

export default router;
