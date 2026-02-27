import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

// ─── Verify Donation Owner ────────────────────────────────────────────────────
// Checks if the requesting user is the original requester of the donation.
// Admins are also allowed through. Attaches donation to req.donation.
export const verifyOwner = async (req, res, next) => {
  try {
    const db = getDB();
    const userEmail = req.decode_email;
    const donationId = req.params.id;

    const donation = await db
      .collection("donations")
      .findOne({ _id: new ObjectId(donationId) });

    if (!donation) {
      return res.status(404).send({ message: "Donation not found" });
    }

    // Allow the original requester
    if (donation.requesterEmail === userEmail) {
      req.donation = donation;
      return next();
    }

    // Also allow admins
    const user = await db.collection("users").findOne({ email: userEmail });
    if (user?.role === "admin") {
      req.donation = donation;
      return next();
    }

    return res.status(403).send({ message: "Forbidden: not your donation" });
  } catch (error) {
    res.status(500).send({ message: "Server error in verifyOwner" });
  }
};
