import { Router } from "express";
import {
  getFunding,
  createCheckoutSession,
  confirmPayment,
} from "../controllers/payment.controller.js";
import { verifyFbToken } from "../middlewares/verifyFbToken.js";

const router = Router();

// Protected — list recent funders (also used to verify a specific session)
router.get("/funding", verifyFbToken, getFunding);

// Protected — create a Stripe checkout session and get the redirect URL
router.post("/payment-checkout-session", verifyFbToken, createCheckoutSession);

// Protected — called after redirect from Stripe success page
router.post("/payment-success", verifyFbToken, confirmPayment);

export default router;
