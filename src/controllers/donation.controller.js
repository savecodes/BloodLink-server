import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

// ─── Get All Donations (Volunteer/Admin, with filter & pagination) ─────────────
export const getAllDonations = async (req, res) => {
  try {
    const db = getDB();
    let { page = 1, limit = 10, search = "", status } = req.query;
    page = Number(page);
    limit = Number(limit);

    const query = {};

    // Filter by status if provided and not "All Status"
    if (status && status !== "All Status") {
      query.status = status.toLowerCase();
    }

    // Search across multiple fields
    if (search) {
      query.$or = [
        { recipientName: { $regex: search, $options: "i" } },
        { requesterName: { $regex: search, $options: "i" } },
        { hospitalName: { $regex: search, $options: "i" } },
        { bloodGroup: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      db.collection("donations").find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      db.collection("donations").countDocuments(query),
    ]);

    res.send({ data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).send({ message: "Server error" });
  }
};

// ─── Get Public Donations (with optional status filter & pagination) ───────────
export const getPublicDonations = async (req, res) => {
  try {
    const db = getDB();
    const { status, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) query.status = status.toLowerCase();

    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      db.collection("donations").find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).toArray(),
      db.collection("donations").countDocuments(query),
    ]);

    res.send({ data, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).send({ message: "Server error" });
  }
};

// ─── Get Donations by User Email (with filter & pagination) ───────────────────
export const getDonationsByUser = async (req, res) => {
  try {
    const db = getDB();
    const { email } = req.params;
    const { status, search, page = 1, limit = 10 } = req.query;

    const query = { requesterEmail: email };

    if (status && status !== "all") query.status = status;

    if (search) {
      query.$or = [
        { recipientName: { $regex: search, $options: "i" } },
        { hospitalName: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      db.collection("donations").find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).toArray(),
      db.collection("donations").countDocuments(query),
    ]);

    res.send({ data, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).send({ message: "Server error" });
  }
};

// ─── Get Dashboard Summary for a User ────────────────────────────────────────
// Returns totals and 4 most recent donation requests
export const getDonationDashboard = async (req, res) => {
  try {
    const db = getDB();
    const { email } = req.params;

    const donations = await db
      .collection("donations")
      .find({ requesterEmail: email })
      .sort({ createdAt: -1 })
      .toArray();

    const summary = {
      total: donations.length,
      pending: donations.filter((d) => d.status === "pending").length,
      completed: donations.filter((d) => d.status === "completed").length,
      cancelled: donations.filter((d) => d.status === "cancelled").length,
      recent: donations.slice(0, 4),
    };

    res.send(summary);
  } catch (error) {
    res.status(500).send({ message: "Server error" });
  }
};

// ─── Get Single Donation by ID ────────────────────────────────────────────────
export const getDonationById = async (req, res) => {
  try {
    const db = getDB();
    const donation = await db
      .collection("donations")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!donation) return res.status(404).send({ message: "Donation not found" });

    res.send(donation);
  } catch (error) {
    res.status(500).send({ message: "Server error" });
  }
};

// ─── Create New Donation Request ──────────────────────────────────────────────
// Blocked users cannot post new requests
export const createDonation = async (req, res) => {
  try {
    const db = getDB();
    const donation = req.body;

    const user = await db.collection("users").findOne({ email: donation.requesterEmail });

    if (user?.status === "blocked") {
      return res.status(403).send({
        message: "Your account is blocked. You cannot post donation requests.",
      });
    }

    const result = await db.collection("donations").insertOne(donation);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to create donation" });
  }
};

// ─── Update Full Donation (owner/admin only) ──────────────────────────────────
export const updateDonation = async (req, res) => {
  try {
    const db = getDB();
    const { _id, ...updateData } = req.body; // strip _id to avoid overwrite

    const result = await db
      .collection("donations")
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update donation" });
  }
};

// ─── Update Donation Status (volunteer/admin only) ────────────────────────────
export const updateDonationStatus = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = ["pending", "inprogress", "completed", "canceled"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).send({ message: "Invalid status value" });
    }

    const result = await db.collection("donations").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update status" });
  }
};

// ─── Delete Donation (owner/admin only) ──────────────────────────────────────
export const deleteDonation = async (req, res) => {
  try {
    const db = getDB();
    const result = await db
      .collection("donations")
      .deleteOne({ _id: new ObjectId(req.params.id) });

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete donation" });
  }
};
