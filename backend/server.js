require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createTables } = require("./models/schema");
const authRoutes = require("./routes/authRoutes");
const { errorHandler, notFound } = require("./middlewares/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────
// Middlewares
// ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SubNest API is running 🚀",
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────
app.use("/api/auth", authRoutes);

// ─────────────────────────────────────────────
// Error Handling (must be last)
// ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─────────────────────────────────────────────
// Start Server (after DB tables are ready)
// ─────────────────────────────────────────────
const startServer = async () => {
  try {
    await createTables();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
