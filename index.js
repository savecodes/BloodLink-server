import express from "express";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
dotenv.config();

import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// JSON files load
const districts = JSON.parse(fs.readFileSync("./districts.json", "utf-8"));
const upzillas = JSON.parse(fs.readFileSync("./upazilas.json", "utf-8"));

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: `${process.env.CLIENT_DOMAIN}`,
    credentials: true,
  }),
);
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
    const fundingCollections = db.collection("funding");

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

    // ============== All Users Get, search, by email  Routes ==================
    app.get("/users", async (req, res) => {
      try {
        let { search = "", page = 1, limit = 10 } = req.query;
        page = Number(page);
        limit = Number(limit);

        const query = {};
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ];
        }

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
          userCollection
            .find(query)
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit)
            .toArray(),
          userCollection.countDocuments(query),
        ]);

        res.send({
          data,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });

    // ============== Users Routes get ==================
    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;

      const result = await userCollection.findOne({ email });

      res.status(201).send({
        role: result?.role,
        status: result?.status,
      });
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

    // ============== Users Role Update ==================
    app.patch("/users/:id/role", async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { role },
      };

      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // ============== Users Status Update ==================
    app.patch("/users/:id/status", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { status },
      };

      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
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
        { returnDocument: "after" },
      );

      if (!result) {
        return res.status(404).send({ message: "User not found" });
      }

      res.send(result);
      res.status(500).send({ message: "Failed to update user" });
    });

    // ============== All donations Get Routes ==================
    app.get("/all-donations", async (req, res) => {
      try {
        let { page = 1, limit = 10, search = "", status } = req.query;
        page = Number(page);
        limit = Number(limit);

        const query = {};

        if (status && status !== "All Status") {
          query.status = status.toLowerCase();
        }

        if (search) {
          query.$or = [
            { recipientName: { $regex: search, $options: "i" } },
            { requesterName: { $regex: search, $options: "i" } },
            { hospitalName: { $regex: search, $options: "i" } },
            { bloodGroup: { $regex: search, $options: "i" } },
          ];
        }

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
          donationsCollections
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray(),

          donationsCollections.countDocuments(query),
        ]);

        res.send({
          data,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
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
        const { email } = req.params;
        const { status, search, page = 1, limit = 10 } = req.query;

        const query = { requesterEmail: email };

        if (status && status !== "all") {
          query.status = status;
        }

        if (search) {
          query.$or = [
            { recipientName: { $regex: search, $options: "i" } },
            { hospitalName: { $regex: search, $options: "i" } },
          ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [data, total] = await Promise.all([
          donationsCollections
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .toArray(),

          donationsCollections.countDocuments(query),
        ]);

        res.send({
          data,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (err) {
        res.status(500).send({ message: "Server error" });
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
      try {
        const { status, page = 1, limit = 10 } = req.query;

        const query = {};
        if (status) {
          query.status = status.toLowerCase();
        }

        const skip = (Number(page) - 1) * Number(limit);

        // Fetch data & total count in parallel
        const [data, total] = await Promise.all([
          donationsCollections
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .toArray(),

          donationsCollections.countDocuments(query),
        ]);

        res.send({
          data,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });

    // ============== donations Post Routes ==================
    app.post("/donations", async (req, res) => {
      const donations = req.body;
      const result = await donationsCollections.insertOne(donations);
      res.status(201).send(result);
    });

    // ============== donations Post Routes for check user is blocked or not==================
    app.post("/donations", async (req, res) => {
      const donation = req.body;

      const user = await userCollection.findOne({
        email: donation.requesterEmail,
      });

      if (user?.status === "blocked") {
        return res.status(403).send({
          message:
            "Your account is blocked. You cannot post donation requests.",
        });
      }

      const result = await donationsCollections.insertOne(donation);
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
      res.send(result);
    });

    // ============== donations patch Routes for change users created posts ==================
    app.patch("/donations/:id/status", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatus = ["pending", "inprogress", "completed", "canceled"];
      if (!allowedStatus.includes(status)) {
        return res.status(400).send({ message: "Invalid status" });
      }

      const result = await donationsCollections.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status,
            updatedAt: new Date(),
          },
        },
      );

      res.send(result);
    });

    // ============== donations Delete Routes for delete users created posts ==================
    app.delete("/donations/:id", async (req, res) => {
      const { id } = req.params;
      const result = await donationsCollections.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // ============== donations Delete Routes ==================
    app.delete("/donations/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationsCollections.deleteOne(query);
      res.send(result);
    });

    // ============== Dashboard Statistics Routes For Admin ==================
    app.get("/dashboard/stats", async (req, res) => {
      try {
        const totalUsers = await userCollection.countDocuments({
          role: "donor",
        });

        const totalDonationRequests =
          await donationsCollections.countDocuments();

        // Real total funding from database
        const fundingResult = await fundingCollections
          .aggregate([
            {
              $group: {
                _id: null,
                total: { $sum: "$amount" },
              },
            },
          ])
          .toArray();

        const totalFunding =
          fundingResult.length > 0 ? fundingResult[0].total : 0;

        // Blood Group Distribution
        const bloodGroupStats = await donationsCollections
          .aggregate([
            {
              $group: {
                _id: "$bloodGroup",
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        const bloodGroupDistribution = bloodGroupStats.map((item) => ({
          name: item._id,
          value: item.count,
        }));

        // Real Daily Funding Data (Last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyFundingData = await fundingCollections
          .aggregate([
            {
              $match: {
                paidAt: { $gte: thirtyDaysAgo },
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: "$paidAt" },
                  month: { $month: "$paidAt" },
                  day: { $dayOfMonth: "$paidAt" },
                },
                funding: { $sum: "$amount" },
              },
            },
            {
              $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
            },
            {
              $project: {
                _id: 0,
                month: {
                  $concat: [
                    {
                      $let: {
                        vars: {
                          monthsInString: [
                            "",
                            "Jan",
                            "Feb",
                            "Mar",
                            "Apr",
                            "May",
                            "Jun",
                            "Jul",
                            "Aug",
                            "Sep",
                            "Oct",
                            "Nov",
                            "Dec",
                          ],
                        },
                        in: {
                          $arrayElemAt: ["$$monthsInString", "$_id.month"],
                        },
                      },
                    },
                    " ",
                    { $toString: "$_id.day" },
                  ],
                },
                funding: 1,
              },
            },
          ])
          .toArray();

        res.send({
          totalUsers,
          totalFunding,
          totalDonationRequests,
          bloodGroupDistribution,
          monthlyFundingData: dailyFundingData,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({
          message: "Failed to load dashboard stats",
          error: error.message,
        });
      }
    });

    // ============== Payment Endpoints Get Routes ==================
    app.get("/funding", async (req, res) => {
      const { limit, session_id } = req.query;
      const query = session_id ? { checkoutSessionId: session_id } : {};

      const result = await fundingCollections
        .find(query)
        .sort({ paidAt: -1 })
        .limit(parseInt(limit) || 10)
        .toArray();

      res.send(result);
    });

    // ============== Payment Endpoints Post Routes ==================
    app.post("/payment-checkout-session", async (req, res) => {
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
              unit_amount: paymentInfo?.amount * 100,
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
    });

    // ============== Payment Endpoints Post Routes ==================
    app.post("/payment-success", async (req, res) => {
      const { sessionId } = req.body;
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const payment = await fundingCollections.findOne({
        paymentIntentId: session.payment_intent,
      });
      if (session.status === "complete" && !payment) {
        const userInfo = {
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
        const result = await fundingCollections.insertOne(userInfo);
        return res.send({ inserted: true });
      }
      return res.send({ inserted: false });
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
startServer().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
