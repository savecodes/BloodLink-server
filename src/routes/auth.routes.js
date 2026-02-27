import { Router } from "express";

const router = Router();

// ─── Note ─────────────────────────────────────────────────────────────────────
// Authentication is handled entirely by Firebase on the client side.
// This router is reserved for future server-side auth endpoints
// (e.g., custom token generation, role sync, logout hooks).

export default router;
