import { admin } from "../config/firebase.js";

// ─── Verify Firebase ID Token ─────────────────────────────────────────────────
// Reads the Bearer token from the Authorization header and verifies it.
// Attaches the decoded email to req.decode_email for downstream use.
export const verifyFbToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  try {
    const idToken = authHeader.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.decode_email = decoded.email;
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
};
