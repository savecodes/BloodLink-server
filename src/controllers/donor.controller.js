import { getDB } from "../config/db.js";

// ─── Search Available Donors ──────────────────────────────────────────────────
// Filters active donors by bloodGroup, district, and upazila.
// All query params are optional — absence means "no filter on that field".
export const searchDonors = async (req, res) => {
  try {
    const db = getDB();
    const { bloodGroup, district, upazila } = req.query;

    const query = {
      role: "donor",
      status: "active",
    };

    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (district) query.district = district;
    if (upazila) query.upazila = upazila;

    const donors = await db.collection("users").find(query).toArray();
    res.send(donors);
  } catch (error) {
    res.status(500).send({ message: "Failed to search donors", error: error.message });
  }
};
