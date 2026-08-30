import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import db from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Production'da xavfsiz bo'lmagan fallback secretlarni ishlatish taqiqlanadi.
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET va JWT_REFRESH_SECRET production muhitida talab qilinadi");
  }
  console.warn("[WARN] JWT_SECRET/JWT_REFRESH_SECRET sozlanmagan — dev fallback ishlatilmoqda");
}

const DEV_ACCESS_SECRET = JWT_SECRET || "dev_secret";
const DEV_REFRESH_SECRET = JWT_REFRESH_SECRET || "dev_refresh_secret";

export function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET || DEV_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" }
  );

  const refreshToken = jwt.sign(
    { id: user.id, jti: randomUUID() },
    JWT_REFRESH_SECRET || DEV_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d" }
  );

  return { accessToken, refreshToken };
}

export function verifyToken(token, secret = JWT_SECRET || DEV_ACCESS_SECRET) {
  return jwt.verify(token, secret);
}

export async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: "Token topilmadi" });
    }

    const payload = verifyToken(token);
    const user = await db.query(
      "SELECT id, tg_id, username, email, role, currency FROM users WHERE id = $1 AND deleted_at IS NULL",
      [payload.id]
    );

    if (!user.rows[0]) {
      return res.status(401).json({ success: false, message: "Foydalanuvchi topilmadi" });
    }

    req.user = user.rows[0];
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Access token muddati tugagan" });
    }
    return res.status(401).json({ success: false, message: "Noto'g'ri token" });
  }
}

export function roleCheck(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Ruxsat yo'q" });
    }
    next();
  };
}
