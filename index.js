import express from "express";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
dotenv.config();

// JSON files load
const districts = JSON.parse(fs.readFileSync("./districts.json", "utf-8"));
const upzillas = JSON.parse(fs.readFileSync("./upazilas.json", "utf-8"));

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// JSON globally assign
app.locals.districts = districts;
app.locals.upzillas = upzillas;

app.get("/", (req, res) => {
  res.send("Blood Donation Backend Running");
});

async function startServer() {
  try {
    await client.connect();
    const db = client.db("BloodLink");
    const userCollection = db.collection("users");

    // ============== blood-groups Routes ==================
    app.get("/blood-groups", (req, res) => {
      res.send(BLOOD_GROUPS);
    });

    // ============== districts Routes ==================
    app.get("/districts", (req, res) => {
      res.json(req.app.locals.districts);
    });

    // ============== upzillas Routes ==================
    app.get("/upzillas", (req, res) => {
      res.json(req.app.locals.upzillas);
    });

    // ============== districts and upzillas both Routes ==================
    app.get("/upzillas/:districtId", (req, res) => {
      const districtId = req.params.districtId;
      const filtered = upzillas.filter((u) => {
        return u.district_id === districtId;
      });

      res.json(filtered);
    });

    // ============== Users Routes ==================
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
startServer().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
