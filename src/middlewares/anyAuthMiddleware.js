// Uch xil autentifikatsiya usulini birlashtiruvchi middleware:
//   1. Telegram WebApp: `x-telegram-init-data` header (initData verify → tg_id orqali user qidirish)
//   2. Web ilova:       `Authorization: Bearer <jwt>`
//   3. Telegram bot:    `x-tg-id: <tg_id>` header
import db from "../config/db.js";
import { authMiddleware } from "./authMiddleware.js";
import { botAuthMiddleware } from "./botAuthMiddleware.js";
import { verifyTelegramInitData } from "../controllers/authController.js";

async function telegramWebAppAuth(req, res, next) {
  try {
    const initData = req.headers["x-telegram-init-data"];
    if (!initData) return false;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return false;

    if (!verifyTelegramInitData(initData, botToken)) {
      res.status(401).json({ success: false, message: "Telegram initData noto'g'ri" });
      return true; // javob yuborildi
    }

    // initData ichidagi user obyektidan tg_id ni ajratib olamiz.
    const params = new URLSearchParams(initData);
    const userJson = params.get("user");
    if (!userJson) {
      res.status(401).json({ success: false, message: "InitData'da user ma'lumoti yo'q" });
      return true;
    }

    const tgUser = JSON.parse(userJson);
    const tgId = tgUser.id;
    if (!tgId) {
      res.status(401).json({ success: false, message: "Telegram user ID topilmadi" });
      return true;
    }

    const result = await db.query(
      `SELECT id, tg_id, username, email, role, currency
       FROM users WHERE tg_id = $1 AND deleted_at IS NULL`,
      [tgId]
    );

    if (!result.rows[0]) {
      res.status(401).json({ success: false, message: "Foydalanuvchi ro'yxatdan o'tmagan" });
      return true;
    }

    req.user = result.rows[0];
    req.authSource = "telegram_webapp";
    next();
    return false;
  } catch (err) {
    next(err);
    return false;
  }
}

export async function anyAuthMiddleware(req, res, next) {
  // 1. Telegram WebApp initData — birinchi tekshiriladi.
  const handled = await telegramWebAppAuth(req, res, next);
  if (handled) return;

  // 2. JWT Bearer token.
  const hasBearer = (req.headers.authorization || "")
    .toLowerCase()
    .startsWith("bearer ");
  if (hasBearer) {
    return authMiddleware(req, res, next);
  }

  // 3. Bot x-tg-id header.
  if (req.headers["x-tg-id"]) {
    return botAuthMiddleware(req, res, next);
  }

  // Hech qanday kredensial — 401.
  return res.status(401).json({
    success: false,
    message: "Autentifikatsiya talab qilinadi",
  });
}

export default anyAuthMiddleware;