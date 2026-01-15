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
    const donationsCollections = db.collection("donations");

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
    // ============== Users Routes Get user by email ==================
    app.get("/users", async (req, res) => {
      try {
        const { email } = req.query;

        if (!email) {
          return res.status(400).send({ message: "Email query is required" });
        }

        const user = await userCollection.findOne({ email });

        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send(user);
      } catch (error) {
        console.error("Get user by email error:", error);
        res.status(500).send({ message: "Failed to fetch user" });
      }
    });

    // ============== Users Routes get ==================
    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;

      const result = await userCollection.findOne({ email });

      res.status(201).send({ role: result?.role });
    });

    // ============== Users Routes Get single user by UID ==================
    app.get("/users/:uid", async (req, res) => {
      const user = await userCollection.findOne({ uid: req.params.uid });
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
      res.send(user);
    });

    // ============== Users Routes Post ==================
    app.post("/users", async (req, res) => {
      const user = req.body;

      const exists = await userCollection.findOne({ uid: user.uid });
      if (exists) {
        return res.status(409).send({ message: "User already exists" });
      }

      const result = await userCollection.insertOne(user);
      res.status(201).send(result);
    });

    // ============== Users Routes update user by uid ==================
    app.put("/users/:uid", async (req, res) => {
      const allowedFields = [
        "name",
        "bloodGroup",
        "district",
        "upazila",
        "photoURL",
      ];

      const payload = {};
      for (const key of allowedFields) {
        if (key in req.body) payload[key] = req.body[key];
      }

      const result = await userCollection.findOneAndUpdate(
        { uid: req.params.uid },
        { $set: payload },
        { returnDocument: "after" }
      );

      if (!result) {
        return res.status(404).send({ message: "User not found" });
      }

      res.send(result);
      res.status(500).send({ message: "Failed to update user" });
    });

    // ============== donations Get Routes ==================
    app.get("/donations/:id", async (req, res) => {
      const { id } = req.params;
      const donations = await donationsCollections.findOne({
        _id: new ObjectId(id),
      });
      if (!donations) return res.status(404).send("User not found");
      res.send(donations);
    });

    // ============== donations Get by search and filters Routes ==================
    app.get("/donations/user/:email", async (req, res) => {
      try {
        const { email } = req.params; // ✅ Destructure করো
        const { status, search } = req.query;

        let query = { requesterEmail: email };

        if (status && status.toLowerCase() !== "all") {
          query.status = status.toLowerCase();
        }

        if (search) {
          query.$or = [
            { recipientName: { $regex: search, $options: "i" } },
            { hospitalName: { $regex: search, $options: "i" } },
          ];
        }

        const donations = await donationsCollections.find(query).toArray();
        res.send(donations);
      } catch (error) {
        res.status(500).send({ message: "server error", error: error.message });
      }
    });

    // ============== donations dashboard Get Routes ==================
    app.get("/donations/dashboard/:email", async (req, res) => {
      const { email } = req.params;
      const donations = await donationsCollections
        .find({ requesterEmail: email })
        .sort({ createdAt: -1 })
        .toArray();
      const summary = {
        total: donations.length,
        pending: donations.filter((d) => d.status === "pending").length,
        completed: donations.filter((d) => d.status === "completed").length,
        cancelled: donations.filter((d) => d.status === "cancelled").length,
        recent: donations.slice(0, 4),
      };

      res.send(summary);
    });

    // ============== Search Donors Route ==================
    app.get("/donors/search", async (req, res) => {
      try {
        const { bloodGroup, district, upazila } = req.query;

        let query = {
          role: "donor",
          status: "active",
        };

        if (bloodGroup) query.bloodGroup = bloodGroup;
        if (district) query.district = district;
        if (upazila) query.upazila = upazila;

        const donors = await userCollection.find(query).toArray();
        res.send(donors);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to search donors", error: error.message });
      }
    });

    // ============== Get all pending donation requests ==================
    app.get("/donations", async (req, res) => {
      const { status } = req.query;

      let query = {};
      if (status) {
        query.status = status.toLowerCase();
      }
      const donations = await donationsCollections.find(query).toArray();
      res.send(donations);
    });

    // ============== donations Post Routes ==================
    app.post("/donations", async (req, res) => {
      const donations = req.body;
      const result = await donationsCollections.insertOne(donations);
      res.status(201).send(result);
    });

    // ============== donations Put Routes ==================
    app.put("/donations/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateData = req.body;

      const { _id, ...updateDocWithoutId } = updateData;

      const updateDoc = {
        $set: updateDocWithoutId,
      };
      const result = await donationsCollections.updateOne(filter, updateDoc);
    });

    // ============== donations Delete Routes ==================
    app.delete("/donations/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationsCollections.deleteOne(query);
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
