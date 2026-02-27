import { Router } from "express";
import {
  getBloodGroups,
  getDistricts,
  getUpazillas,
  getUpazillasByDistrict,
} from "../controllers/location.controller.js";

const router = Router();

// All public — needed for registration forms and search filters

// GET /blood-groups
router.get("/blood-groups", getBloodGroups);

// GET /districts
router.get("/districts", getDistricts);

// GET /upzillas
router.get("/upzillas", getUpazillas);

// GET /upzillas/:districtId
router.get("/upzillas/:districtId", getUpazillasByDistrict);

export default router;
