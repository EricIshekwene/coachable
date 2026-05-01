import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./db/pool.js";
import authRoutes from "./routes/auth.js";
import onboardingRoutes from "./routes/onboarding.js";
import teamRoutes from "./routes/teams.js";
import playRoutes from "./routes/plays.js";
import folderRoutes from "./routes/folders.js";
import userRoutes from "./routes/users.js";
import verificationRoutes from "./routes/verification.js";
import adminRoutes, { cleanupStaleAccounts, cleanupDeletedTeams } from "./routes/admin.js";
import sharedRoutes from "./routes/shared.js";
import errorReportRoutes from "./routes/errorReports.js";
import platformPlaysRoutes from "./routes/platformPlays.js";
import pageSectionsRoutes from "./routes/pageSections.js";
import userIssuesRoutes from "./routes/userIssues.js";
import playbookSectionsRoutes from "./routes/playbookSections.js";
import demoVideosRoutes from "./routes/demoVideos.js";
import prefabsRoutes from "./routes/prefabs.js";
import sportPresetsRoutes from "./routes/sportPresets.js";
import { syncSports } from "./utils/syncSports.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
app.use(cookieParser());

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
app.use("/shared", sharedRoutes);
app.use("/error-reports", errorReportRoutes);
app.use("/platform-plays", platformPlaysRoutes);
app.use("/page-sections", pageSectionsRoutes);
app.use("/user-issues", userIssuesRoutes);
app.use("/playbook-sections", playbookSectionsRoutes);
app.use("/demo-videos", demoVideosRoutes);
app.use("/prefabs", prefabsRoutes);
app.use("/sport-presets", sportPresetsRoutes);

// --------------- Static files ---------------

const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  // Hashed assets: cache forever (filename changes on new build)
  app.use(
    "/assets",
    express.static(path.join(distPath, "assets"), {
      maxAge: "1y",
      immutable: true,
    })
  );
  // All other static files (favicon, images, etc): short cache
  app.use(express.static(distPath, { maxAge: "1h" }));
  // SPA fallback: always serve index.html with no-cache so browsers get the latest
  app.get("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// --------------- Error handler ---------------

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
});

// --------------- Start ---------------

// --------------- Auto-migrate on startup ---------------

async function autoMigrate() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, "db", "schema.sql"), "utf-8");
    await pool.query(sql);
    console.log("Auto-migration complete.");
  } catch (err) {
    console.error("Auto-migration failed (non-fatal):", err.message);
  }
}

autoMigrate()
  .then(() => syncSports(pool))
  .then(() => {
  app.listen(PORT, () => {
    console.log(`Coachable API listening on port ${PORT}`);
  });

  // Auto-cleanup: delete non-onboarded accounts older than 24h (runs every 6 hours)
  const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
  const runCleanup = () => {
    cleanupStaleAccounts()
      .then((r) => { if (r.cleaned > 0) console.log(`Cleanup: removed ${r.cleaned} stale account(s)`); })
      .catch((err) => console.error("Cleanup error:", err.message));
  };
  setTimeout(runCleanup, 30_000); // first run 30s after startup
  setInterval(runCleanup, CLEANUP_INTERVAL_MS);

  // Auto-cleanup: hard-delete teams soft-deleted more than 30 days ago (runs every 24 hours)
  const TEAM_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
  const runTeamCleanup = () => {
    cleanupDeletedTeams()
      .then((r) => { if (r.cleaned > 0) console.log(`Team cleanup: hard-deleted ${r.cleaned} expired team(s)`); })
      .catch((err) => console.error("Team cleanup error:", err.message));
  };
  setTimeout(runTeamCleanup, 60_000); // first run 60s after startup
  setInterval(runTeamCleanup, TEAM_CLEANUP_INTERVAL_MS);
});
