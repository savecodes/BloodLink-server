import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Route imports
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import donationRoutes from "./routes/donation.routes.js";
import allDonationsRoutes from "./routes/allDonations.routes.js";
import donorRoutes from "./routes/donor.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import locationRoutes from "./routes/location.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

dotenv.config();

const app = express();

// ─── Middlewares ─────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: ["https://be-blood-link.netlify.app", "http://localhost:5173"],
    credentials: true,
  }),
);
app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("🩸 BloodLink Backend Running");
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/users", userRoutes);           
app.use("/donations", donationRoutes);     
app.use("/all-donations", allDonationsRoutes);  
app.use("/donors", donorRoutes);         
app.use("/", paymentRoutes);          
app.use("/", locationRoutes);              
app.use("/dashboard", dashboardRoutes); 
app.use("/", authRoutes);   

export default app;
