import { Bot } from "node-telegram-bot-api";
import db from "../config/db.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
const started = process.env.TELEGRAM_BOT_ENABLED !== "false";

export function startBot() {
  if (!token || !started) {
    console.log("Telegram bot o'chirilgan (TELEGRAM_BOT_TOKEN yoki TELEGRAM_BOT_ENABLED emas)");
    return null;
  }

  const bot = new Bot(token, { polling: true });

  bot.on("error", (err) => {
    console.error("Telegram bot transport xatosi:", err.message);
  });

  bot.catch((err) => {
    console.error("Bot handler xatosi:", err.message);
  });

  bot.command("start", async (ctx) => {
    const chatId = ctx.chatId;
    const tgId = ctx.from?.id;
    const username = ctx.from?.username || `tg_${tgId}`;

    try {
      await db.query(
        `INSERT INTO users (tg_id, username, role)
         VALUES ($1, $2, 'user')
         ON CONFLICT (tg_id) DO UPDATE SET updated_at = NOW()`,
        [tgId, username]
      );

      await ctx.reply(
        `Salom, ${username}! 👋\n\nKirim-chiqimlaringizni kuzatib borish uchun:\n` +
        `/add <summa> [izoh] - chiqim qo'shish\n` +
        `/summary - bu oy statistikasi`
      );
    } catch (err) {
      console.error("Bot register xatosi:", err.message);
      await ctx.reply("Xatolik yuz berdi, qayta urinib ko'ring.");
    }
  });

  bot.command("add", async (ctx) => {
    const parts = (ctx.match || "").trim().split(/\s+/);
    const amount = parseFloat(parts[0]);

    if (!amount || amount <= 0) {
      return ctx.reply("Format: /add <summa> [izoh]\nMasalan: /add 50000 tushlik");
    }

    try {
      const user = await db.query(
        "SELECT id FROM users WHERE tg_id = $1 AND deleted_at IS NULL",
        [ctx.from?.id]
      );
      if (!user.rows[0]) {
        return ctx.reply("Avval /start buyrug'ini yuboring.");
      }

      const comment = parts.slice(1).join(" ") || null;
      const result = await db.query(
        `INSERT INTO transactions (user_id, amount, type, comment)
         VALUES ($1, $2, 'expense', $3) RETURNING id`,
        [user.rows[0].id, amount, comment]
      );

      await ctx.reply(
        `✅ Chiqim qo'shildi!\nSumma: ${amount}\nIzoh: ${comment || "-"}\nID: ${result.rows[0].id}`
      );
    } catch (err) {
      console.error("Bot add xatosi:", err.message);
      await ctx.reply("Xatolik yuz berdi.");
    }
  });

  bot.command("summary", async (ctx) => {
    try {
      const user = await db.query(
        "SELECT id FROM users WHERE tg_id = $1 AND deleted_at IS NULL",
        [ctx.from?.id]
      );
      if (!user.rows[0]) {
        return ctx.reply("Avval /start buyrug'ini yuboring.");
      }

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const result = await db.query(
        `SELECT
           COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) AS income,
           COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expense
         FROM transactions
         WHERE user_id = $1 AND deleted_at IS NULL
           AND EXTRACT(MONTH FROM created_at) = $2
           AND EXTRACT(YEAR FROM created_at) = $3`,
        [user.rows[0].id, month, year]
      );

      const income = parseFloat(result.rows[0].income);
      const expense = parseFloat(result.rows[0].expense);

      await ctx.reply(
        `📊 Bu oy uchun statistikangiz:\n` +
        `➕ Kirim: ${income}\n` +
        `➖ Chiqim: ${expense}\n` +
        `💰 Balans: ${income - expense}`
      );
    } catch (err) {
      console.error("Bot summary xatosi:", err.message);
      await ctx.reply("Xatolik yuz berdi.");
    }
  });

  bot.startPolling().catch((err) => {
    console.error("Telegram polling to'xtadi:", err.message);
  });

  console.log("Telegram bot ishga tushdi");
  return bot;
}
