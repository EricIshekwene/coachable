import express from "express";
import cors from "cors";
import pool from "./db/pool.js";
import authRoutes from "./routes/auth.js";
import onboardingRoutes from "./routes/onboarding.js";
import teamRoutes from "./routes/teams.js";
import playRoutes from "./routes/plays.js";
import folderRoutes from "./routes/folders.js";
import userRoutes from "./routes/users.js";
import verificationRoutes from "./routes/verification.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const PORT = process.env.PORT || 3001;

// --------------- Middleware ---------------

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, cb) {
      // Allow requests with no origin (curl, mobile, etc.)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

// --------------- Health check ---------------

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

// --------------- Routes ---------------

app.use("/auth", authRoutes);
app.use("/onboarding", onboardingRoutes);
app.use("/teams", teamRoutes);
app.use("/teams", playRoutes);
app.use("/teams", folderRoutes);
app.use("/users", userRoutes);
app.use("/verification", verificationRoutes);
app.use("/admin", adminRoutes);

// --------------- Error handler ---------------

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
});

// --------------- Start ---------------

app.listen(PORT, () => {
  console.log(`Coachable API listening on port ${PORT}`);
});
