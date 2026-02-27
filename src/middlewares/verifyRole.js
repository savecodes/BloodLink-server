import { getDB } from "../config/db.js";

// ─── Verify Admin Role ────────────────────────────────────────────────────────
// Must be used AFTER verifyFbToken so req.decode_email is available.
export const verifyAdmin = async (req, res, next) => {
  try {
    const db = getDB();
    const user = await db.collection("users").findOne({ email: req.decode_email });

    if (!user) {
      return res.status(401).send({ message: "Unauthorized" });
    }

    if (user.role !== "admin") {
      return res.status(403).send({ message: "Forbidden access" });
    }

    next();
  } catch (error) {
    res.status(500).send({ message: "Server error in verifyAdmin" });
  }
};

// ─── Verify Volunteer or Admin Role ──────────────────────────────────────────
// Volunteers and admins can access volunteer-level protected routes.
export const verifyVolunteer = async (req, res, next) => {
  try {
    const db = getDB();
    const user = await db.collection("users").findOne({ email: req.decode_email });

    if (!user) {
      return res.status(401).send({ message: "Unauthorized" });
    }

    if (user.role !== "volunteer" && user.role !== "admin") {
      return res.status(403).send({ message: "Forbidden access" });
    }

    next();
  } catch (error) {
    res.status(500).send({ message: "Server error in verifyVolunteer" });
  }
};
