import { getDB } from "../config/db.js";
import stripe from "../config/stripe.js";

// ─── Get Funding Records ──────────────────────────────────────────────────────
// Optionally filter by session_id to verify a specific payment
export const getFunding = async (req, res) => {
  try {
    const db = getDB();
    const { limit, session_id } = req.query;

    const query = session_id ? { checkoutSessionId: session_id } : {};

    const result = await db
      .collection("funding")
      .find(query)
      .sort({ paidAt: -1 })
      .limit(parseInt(limit) || 10)
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch funding" });
  }
};

// ─── Create Stripe Checkout Session ──────────────────────────────────────────
// Generates a Stripe-hosted payment page and returns the URL to redirect to
export const createCheckoutSession = async (req, res) => {
  try {
    const paymentInfo = req.body;

    if (!paymentInfo?.amount || paymentInfo.amount <= 0) {
      return res.status(400).send({ message: "Invalid amount" });
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: paymentInfo?.currency || "usd",
            product_data: {
              name: paymentInfo?.purpose || "Platform Funding",
            },
            unit_amount: paymentInfo.amount * 100, // Stripe expects amount in cents
          },
          quantity: 1,
        },
      ],
      customer_email: paymentInfo?.email,
      mode: "payment",
      metadata: {
        userName: paymentInfo.name,
        userImage: paymentInfo.image,
      },
      success_url: `${process.env.CLIENT_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_DOMAIN}/dashboard/payment-cancelled`,
    });

    res.send({ url: session.url });
  } catch (error) {
    res.status(500).send({ message: "Failed to create checkout session", error: error.message });
  }
};

// ─── Confirm Payment After Redirect ──────────────────────────────────────────
// Called from success page — verifies session and saves payment record to DB.
// Idempotent: won't insert duplicate if payment already recorded.
export const confirmPayment = async (req, res) => {
  try {
    const db = getDB();
    const { sessionId } = req.body;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Check for duplicate entry using paymentIntentId
    const existing = await db
      .collection("funding")
      .findOne({ paymentIntentId: session.payment_intent });

    if (session.status === "complete" && !existing) {
      const fundingRecord = {
        name: session.customer_details?.name || "Anonymous",
        email: session.customer_details?.email,
        image: session.metadata?.userImage || null,
        amount: session.amount_total / 100,
        currency: session.currency,
        paymentIntentId: session.payment_intent,
        checkoutSessionId: session.id,
        paymentStatus: session.payment_status,
        paidAt: new Date(session.created * 1000),
      };

      await db.collection("funding").insertOne(fundingRecord);
      return res.send({ inserted: true });
    }

    return res.send({ inserted: false });
  } catch (error) {
    res.status(500).send({ message: "Failed to confirm payment", error: error.message });
  }
};
