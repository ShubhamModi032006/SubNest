require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createTables } = require("./models/schema");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const contactRoutes = require("./routes/contactRoutes");
const productRoutes = require("./routes/productRoutes");
const planRoutes = require("./routes/planRoutes");
const taxRoutes = require("./routes/taxRoutes");
const discountRoutes = require("./routes/discountRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const quotationTemplateRoutes = require("./routes/quotationTemplateRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const portalRoutes = require("./routes/portalRoutes");
const approvalRoutes = require("./routes/approvalRoutes");
const { handleStripeWebhook } = require("./controllers/paymentController");
const { errorHandler, notFound } = require("./middlewares/errorHandler");
const { requestLogger } = require("./middlewares/requestLogger");
const { sendSuccess } = require("./utils/apiResponse");

const app = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────
// Middlewares
// ─────────────────────────────────────────────
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);
app.use(requestLogger);

// Stripe webhook must use raw payload for signature verification.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  return sendSuccess(
    res,
    200,
    { timestamp: new Date().toISOString() },
    "SubNest API is running"
  );
});

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/products", productRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/taxes", taxRoutes);
app.use("/api/discounts", discountRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/quotation-templates", quotationTemplateRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api", portalRoutes);
app.use("/api/approvals", approvalRoutes);

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
