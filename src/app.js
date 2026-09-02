import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";

import swaggerSpec from "./config/swagger.js";
import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import errorMiddleware from "./middlewares/errorMiddleware.js";
import { startBot } from "./bot/bot.js";

const app = express();

// Faqat ruxsat etilgan origin'larga CORS. Bo'sh bo'lsa (dev) — hamma origin ruxsat etiladi.
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins.length
      ? (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin))
      : true,
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Umumiy va auth'ga oid rate-limit (brute force himoyasi)
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message: "So'rovlar soni cheklangan, birozdan keyin urinib ko'ring" },
  })
);

if (process.env.NODE_ENV !== "test") {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message: "Juda ko'p urinish, 15 daqiqadan keyin qaytadan urinib ko'ring" },
  });
  app.use("/api/users/auth/login", authLimiter);
  app.use("/api/users/auth/register", authLimiter);
  app.use("/api/users/auth/tg-register", authLimiter);
}

app.get("/", (req, res) => {
  res.json({ success: true, message: "Moliya Tracker API ishlayapti" });
});

// Swagger UI
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "Moliya Tracker API - Swagger",
    swaggerOptions: { persistAuthorization: true },
  })
);

app.use("/api", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Endpoint topilmadi" });
});

app.use(errorMiddleware);

export { app };

// Telegram botni ishga tushiramiz
if (process.env.NODE_ENV !== "test") {
  startBot();
}
