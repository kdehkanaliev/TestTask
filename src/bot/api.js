// Bot <-> Backend REST API aloqa qatlami.
// Barcha so'rovlar `x-tg-id` headerini olib boradi — backend aynan shu header
// orqali so'rov botdan kelayotganini tasdiqlaydi (anyAuthMiddleware).
// `tg-register` uchun esa Telegram initData ham generatsiya qilinadi, shunda
// backend'dagi verifyTelegramInitData tekshiruvidan muvaffaqiyatli o'tadi.
import { createHmac } from "node:crypto";

const API_BASE_URL = (process.env.API_BASE_URL || "http://localhost:3000/api").replace(
  /\/+$/,
  ""
);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

// Backend'dan tushunarli xatolik xabari olib keluvchi xato klassi.
export class BotApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Telegram WebApp initData ni HMAC-SHA256 yordamida sign qilish.
// Bot server bot tokenni bilgani uchun backend tekshiruvidan o'tadigan
// yaroqli initData yiqa oladi.
function buildInitData(tgId, username) {
  const fields = new URLSearchParams();
  fields.set("auth_date", String(Math.floor(Date.now() / 1000)));
  fields.set(
    "user",
    JSON.stringify({ id: tgId, username: username || `tg_${tgId}` })
  );

  const dataCheckString = [...fields.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  fields.set("hash", hash);
  return fields.toString();
}

// Umumiy so'rov funksiyasi. Har bir so'rov try-catch darajasida emas, balki
// shu yagona joyda yopilgan — xatoliklar BotApiError sifatida chiqariladi.
async function request(method, path, { tgId, json, query } = {}) {
  const url = new URL(API_BASE_URL + path);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers = { "Content-Type": "application/json" };
  if (tgId) headers["x-tg-id"] = String(tgId);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch (err) {
    // Backend o'chik yoki tarmoq xatosi
    throw new BotApiError(
      0,
      "Backend bilan aloqa yo'qoldi. Birazdan keyin qayta urinib ko'ring."
    );
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message =
      body?.message || `Backend xatolik qaytardi (HTTP ${res.status}).`;
    throw new BotApiError(res.status, message);
  }

  return body;
}

// Backend'dagi har bir endpoint uchun qulay metodlar.
const api = {
  // 1-qadam: foydalanuvchi tizimda bormi?
  tgCheck(tgId) {
    return request("GET", "/users/auth/tg-check", { tgId });
  },

  // 3-qadam: email+parol bilan to'liq ro'yxatdan o'tkazish
  tgRegister({ tgId, username, email, password }) {
    return request("POST", "/users/auth/tg-register", {
      tgId,
      json: {
        tg_id: Number(tgId),
        username,
        email,
        password,
        initData: buildInitData(tgId, username),
      },
    });
  },

  // Kategoriyalarni olish (type: "income" | "expense" | undefined)
  getCategories(tgId, type) {
    return request("GET", "/categories", {
      tgId,
      query: type ? { type } : undefined,
    });
  },

  // Yangi shaxsiy kategoriya qo'shish
  createCategory(tgId, { title, type }) {
    return request("POST", "/categories", { tgId, json: { title, type } });
  },

  // Kirim yoki chiqimni yozish
  createTransaction(tgId, { category_id, amount, type, comment }) {
    return request("POST", "/transactions", {
      tgId,
      json: { category_id, amount, type, comment },
    });
  },

  // Tanlangan kategoriyaga oylik limit belgilash
  setBudget(tgId, { category_id, limit_amount, month, year }) {
    return request("POST", "/budgets", {
      tgId,
      json: { category_id, limit_amount, month, year },
    });
  },

  // Oylik statistika (iskirdadida joriy oy)
  getSummary(tgId, { month, year } = {}) {
    const now = new Date();
    return request("GET", "/stats/summary", {
      tgId,
      query: {
        month: month || now.getMonth() + 1,
        year: year || now.getFullYear(),
      },
    });
  },

  // Gemini orqali AI moliya maslahati
  getAIAdvice(tgId, { month, year } = {}) {
    const now = new Date();
    return request("GET", "/ai/advice", {
      tgId,
      query: {
        month: month || now.getMonth() + 1,
        year: year || now.getFullYear(),
      },
    });
  },
};

export default api;