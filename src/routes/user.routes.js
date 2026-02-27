import { Router } from "express";
import {
  getUserRole,
  getAllUsers,
  getUserByUid,
  createUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
} from "../controllers/user.controller.js";
import { verifyFbToken } from "../middlewares/verifyFbToken.js";
import { verifyAdmin } from "../middlewares/verifyRole.js";

const router = Router();

// Public — called right after login to determine what dashboard to show
router.get("/role/:email", verifyFbToken, getUserRole);

// Admin — get all users with search and pagination
router.get("/", verifyFbToken, verifyAdmin, getAllUsers);

// Protected — get a single user's profile by Firebase UID
router.get("/:uid", verifyFbToken, getUserByUid);

// Public — called once on registration to save user to DB
router.post("/", createUser);

// Protected — user updates their own profile
router.put("/:uid", verifyFbToken, updateUser);

// Admin — change a user's role (donor / volunteer / admin)
router.patch("/:id/role", verifyFbToken, verifyAdmin, updateUserRole);

// Admin — block or activate a user
router.patch("/:id/status", verifyFbToken, verifyAdmin, updateUserStatus);

export default router;
