import admin from "firebase-admin";

// ─── Initialize Firebase Admin SDK ───────────────────────────────────────────
// The service account key is stored as a Base64 string in the .env file.
// To generate it, run: node keyconvert.js  →  paste the output into FB_SERVICE_KEY
export function initFirebase() {
  const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString("utf8");
  const serviceAccount = JSON.parse(decoded);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase Admin initialized");
}

export { admin };
