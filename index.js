import dotenv from "dotenv";
dotenv.config();
import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import { initFirebase } from "./src/config/firebase.js";

const PORT = process.env.PORT || 3000;

// ─── startServer ───────────────────────────────────────────────────────────────
async function startServer() {
  try {
    // Initialize Firebase Admin
    initFirebase();

    // Connect to MongoDB
    await connectDB();

    // Start listening
    app.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
