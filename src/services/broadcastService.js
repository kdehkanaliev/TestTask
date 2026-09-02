// ============================================================
// broadcastService — Telegram orqali ommaviy xabar yuborish
// ------------------------------------------------------------
// Faol foydalanuvchilarga (tg_id bor va o'chirilmagan) markdown
// qo'llab-quvvatlovchi xabarlarni yuboradi. Har bir yuborish
// orasida kichik pauza (throttle) qilinadi, Telegram 429/limiti
// cheklovlariga yo'l qo'ymaslik uchun.
// ============================================================
import { Bot } from "node-telegram-bot-api";

import db from "../config/db.js";

const token = (process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "").trim();

// Bir nechta vaqtincha Bot xususiyatini qaytaradi (markdown vs html parse_mode).
export async function sendBroadcast({ text, parseMode = "Markdown", delayMs = 65 }) {
  if (!token) {
    return { sent: 0, failed: 0, skipped: 0, error: "TELEGRAM_BOT_TOKEN sozlanmagan" };
  }

  // Faol foydalanuvchilar: tg_id bor va soft-delete qilinmagan.
  const usersResult = await db.query(
    `SELECT id, tg_id FROM users
     WHERE tg_id IS NOT NULL AND deleted_at IS NULL`
  );
  const users = usersResult.rows;

  const bot = new Bot(token, { polling: false });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // 429 (flood) xatosi kelganda qayta urinish uchun hisoblagich.
  const sendWithRetry = async (tgId, retries = 3) => {
    try {
      await bot.sendMessage(tgId, text, {
        parse_mode: parseMode,
        disable_web_page_preview: true,
      });
      sent += 1;
    } catch (err) {
      const flood = err?.response?.statusCode === 429 || /Too Many Requests/i.test(err?.message);
      if (flood && retries > 0) {
        await sleep(1500);
        return sendWithRetry(tgId, retries - 1);
      }
      // Foydalanuvchi botni to'sib qo'ygan yoki tg_id yaroqsiz — skip.
      skipped += 1;
    }
  };

  for (const user of users) {
    await sendWithRetry(user.tg_id);
    await sleep(delayMs);
  }

  bot.close?.();
  return { sent, failed, skipped, total: users.length };
}
