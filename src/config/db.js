import { MongoClient, ServerApiVersion } from "mongodb";

let db = null;

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
export async function connectDB() {
  const client = new MongoClient(process.env.MONGO_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  db = client.db("BloodLink");

  console.log("✅ Connected to MongoDB");
  return db;
}

// ─── Get DB instance ─────────────────────────────────────────────────────────
// Call this in controllers/middlewares after connectDB() is done
export function getDB() {
  if (!db) throw new Error("Database not initialized. Call connectDB() first.");
  return db;
}
