// Ikkala autentifikatsiya usulini bir pog'onaga birlashtiruvchi middleware:
//   - Web ilova:   `Authorization: Bearer <jwt>`
//   - Telegram bot: `x-tg-id: <tg_id>` header
// Ikkalasi bo'lsa Bearer birinchi o'ringa qo'yiladi, aks holda biri etarli.
import { authMiddleware } from "./authMiddleware.js";
import { botAuthMiddleware } from "./botAuthMiddleware.js";

export function anyAuthMiddleware(req, res, next) {
  const hasBearer = (req.headers.authorization || "")
    .toLowerCase()
    .startsWith("bearer ");
  const hasTgId = Boolean(req.headers["x-tg-id"]);

  // Bot so'rovlari `x-tg-id` headeri bilan keladi; Bearer bo'lmagan holda bot usuli ishlatiladi.
  if (!hasBearer && hasTgId) {
    return botAuthMiddleware(req, res, next);
  }
  return authMiddleware(req, res, next);
}

export default anyAuthMiddleware;