// Telegram bot so'rovlarini autentifikatsiya qiluvchi middleware.
// Bot har bir API so'roviga `x-tg-id` headerini qo'shib yuboradi.
// Shu header orqali foydalanuvchi bazadan qidiriladi va `req.user`ga o'rnatiladi.
import db from "../config/db.js";

export async function botAuthMiddleware(req, res, next) {
  try {
    const tgId = Number(req.headers["x-tg-id"]);
    if (!Number.isInteger(tgId) || tgId <= 0) {
      return res.status(401).json({
        success: false,
        message: "x-tg-id header noto'g'ri yoki kiritilmagan",
      });
    }

    const result = await db.query(
      `SELECT id, tg_id, username, email, role, currency
       FROM users WHERE tg_id = $1 AND deleted_at IS NULL`,
      [tgId]
    );

    if (!result.rows[0]) {
      return res.status(401).json({
        success: false,
        message: "Foydalanuvchi ro'yxatdan o'tmagan",
      });
    }

    req.user = result.rows[0];
    req.authSource = "bot";
    next();
  } catch (err) {
    next(err);
  }
}

export default botAuthMiddleware;