import dotenv from "dotenv";
dotenv.config();
import Stripe from "stripe";

// ─── Stripe instance (singleton) ─────────────────────────────────────────────
// STRIPE_SECRET_KEY must be set in .env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
console.log("Stripe key:", process.env.STRIPE_SECRET_KEY);

export default stripe;
