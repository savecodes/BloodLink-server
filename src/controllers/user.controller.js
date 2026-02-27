import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

// ─── Get User Role & Status ───────────────────────────────────────────────────
export const getUserRole = async (req, res) => {
  try {
    const db = getDB();
    const result = await db
      .collection("users")
      .findOne({ email: req.params.email });

    res.status(200).send({
      role: result?.role,
      status: result?.status,
    });
  } catch (error) {
    res.status(500).send({ message: "Failed to get user role" });
  }
};

// ─── Get All Users (Admin only, with search & pagination) ─────────────────────
export const getAllUsers = async (req, res) => {
  try {
    const db = getDB();
    let { search = "", page = 1, limit = 10 } = req.query;
    page = Number(page);
    limit = Number(limit);

    // Build dynamic query — supports searching by name, email or phone
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      db
        .collection("users")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("users").countDocuments(query),
    ]);

    res.send({
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).send({ message: "Server error" });
  }
};

// ─── Get Single User by Firebase UID ─────────────────────────────────────────
export const getUserByUid = async (req, res) => {
  try {
    const db = getDB();
    const user = await db.collection("users").findOne({ uid: req.params.uid });

    if (!user) return res.status(404).send({ message: "User not found" });

    res.send(user);
  } catch (error) {
    res.status(500).send({ message: "Server error" });
  }
};

// ─── Create New User ──────────────────────────────────────────────────────────
export const createUser = async (req, res) => {
  try {
    const db = getDB();
    const user = req.body;

    // Prevent duplicate user registration
    const exists = await db.collection("users").findOne({ uid: user.uid });
    if (exists) return res.status(409).send({ message: "User already exists" });

    const result = await db.collection("users").insertOne(user);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to create user" });
  }
};

// ─── Update User Profile ──────────────────────────────────────────────────────
// Only whitelisted fields can be updated to prevent malicious overwrites
export const updateUser = async (req, res) => {
  try {
    const db = getDB();
    const allowedFields = [
      "name",
      "phone",
      "bloodGroup",
      "district",
      "upazila",
      "photoURL",
    ];

    const payload = {};
    for (const key of allowedFields) {
      if (key in req.body) payload[key] = req.body[key];
    }

    const result = await db
      .collection("users")
      .findOneAndUpdate(
        { uid: req.params.uid },
        { $set: payload },
        { returnDocument: "after" },
      );

    if (!result) return res.status(404).send({ message: "User not found" });

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update user" });
  }
};

// ─── Update User Role (Admin only) ───────────────────────────────────────────
export const updateUserRole = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { role } = req.body;

    const result = await db
      .collection("users")
      .updateOne({ _id: new ObjectId(id) }, { $set: { role } });

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update role" });
  }
};

// ─── Update User Status (Admin only) ─────────────────────────────────────────
export const updateUserStatus = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { status } = req.body;

    const result = await db
      .collection("users")
      .updateOne({ _id: new ObjectId(id) }, { $set: { status } });

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update status" });
  }
};
