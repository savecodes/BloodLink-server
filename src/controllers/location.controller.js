import fs from "fs";
import path from "path";

// ─── Load JSON data once at startup (not on every request) ───────────────────
const districts = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "districts.json"), "utf-8")
);
const upazillas = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "upazilas.json"), "utf-8")
);

// ─── Get All Blood Groups ─────────────────────────────────────────────────────
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const getBloodGroups = (req, res) => {
  res.send(BLOOD_GROUPS);
};

// ─── Get All Districts ────────────────────────────────────────────────────────
export const getDistricts = (req, res) => {
  res.json(districts);
};

// ─── Get All Upazillas ────────────────────────────────────────────────────────
export const getUpazillas = (req, res) => {
  res.json(upazillas);
};

// ─── Get Upazillas by District ID ─────────────────────────────────────────────
export const getUpazillasByDistrict = (req, res) => {
  const { districtId } = req.params;
  const filtered = upazillas.filter((u) => u.district_id === districtId);
  res.json(filtered);
};
