// ============================================================
// SmartFinance Telegram Bot
// ------------------------------------------------------------
// Bot hech qachon to'g'ridan-to'g'ri bazaga kirmaydi — barcha harakatlar
// Express backend REST API orqali amalga oshiriladi (src/bot/api.js).
//
// Xavfsizlik:
//  - Har bir API so'rovi `x-tg-id` headerini olib boradi, backend shu header
//    orqali so'rov botdan kelganini tasdiqlaydi (anyAuthMiddleware).
//  - Ro'yxatdan o'tishda backend initData tekshiruvi ham o'tadi (bot token).
//
// Interfeys:
//  - Ro'yxatdan o'tish qadam-baqadam muloqot rejimida (email -> parol).
//  - Asosiy menyu reply keyboard orqali, tanlovlar inline keyboard orqali.
// ============================================================
import { Bot } from "node-telegram-bot-api";

import api, { BotApiError } from "./api.js";
import sessionStore from "./session.js";
import * as kb from "./keyboards.js";

const token = (process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "").trim();
const started = process.env.TELEGRAM_BOT_ENABLED !== "false";

// ---------- Yordamchi konstantalar va funksiyalar ----------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MONTHS_UZ = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

const typeLabel = (type) => (type === "income" ? "💰 Kirim" : "💸 Chiqim");

// Sonlarni minglik ajratgichlar bilan chiroyli formatlash (1234567 -> 1 234 567)
function formatMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  const rounded = Math.round(num * 100) / 100;
  const str = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Foydalanuvchi kiritgan summadan son ajratib olish ("50 000", "50000,5" -> 50000.5)
function parseAmount(text) {
  const cleaned = String(text).replace(/\s+/g, "").replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

// Xatoliklarni foydalanuvchiga tushunarli qilib yetkazish.
async function handleError(ctx, err) {
  console.error("[Bot] Xatolik:", err?.message);
  const text =
    err instanceof BotApiError
      ? `❌ Xatolik: ${err.message}`
      : "❌ Kutilmagan xatolik yuz berdi. Qayta urinib ko'ring.";
  try {
    await ctx.reply(text);
  } catch (replyErr) {
    console.error("[Bot] Xato xabarini yuborib bo'lmadi:", replyErr.message);
  }
}

// Inline callback'dan kelganda xabarni tahrirlaydi, aks holda yangi xabar yuboradi.
async function editOrReply(ctx, text, extra = {}) {
  const msg = ctx.callbackQuery?.message;
  if (msg?.message_id) {
    return ctx.api.editMessageText({
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      text,
      ...extra,
    });
  }
  return ctx.reply(text, extra);
}

// ---------- Asosiy menyu ----------

async function showMainMenu(ctx, text) {
  await ctx.reply(text || "Asosiy menyu:", { reply_markup: kb.mainMenu() });
}

// ---------- 1) Ro'yxatdan o'tish (Auth flow) ----------

async function handleStart(ctx) {
  const tgId = ctx.from?.id;
  const username = ctx.from?.username || `tg_${tgId}`;
  if (!tgId) return;

  sessionStore.clearSession(tgId);

  try {
    // Foydalanuvchi allaqachon ro'yxatdan o'tganmi?
    const result = await api.tgCheck(tgId);

    if (result.registered) {
      return showMainMenu(ctx, `Xush kelibsiz, ${username}! 👋`);
    }

    // 1-qadam: email so'raladi
    sessionStore.setSession(tgId, { step: "auth_email", username });
    return ctx.reply(
      `Salom, ${username}! 👋\n\n` +
        "Kirim-chiqimlaringizni kuzatish uchun avval ro'yxatdan o'ting.\n\n" +
        "1-qadam: Email manzilingizni yuboring:"
    );
  } catch (err) {
    return handleError(ctx, err);
  }
}

async function handleCancel(ctx) {
  const tgId = ctx.from?.id;
  if (tgId) sessionStore.clearSession(tgId);
  return ctx.reply("Bekor qilindi. ✅ Asosiy menyuda davom eting.");
}

// Ro'yxatdan o'tishni yakunlash (email bo'sh bo'lsa — yangi user yaratiladi)
async function finishRegistration(ctx, session, password) {
  const result = await api.tgRegister({
    tgId: ctx.from.id,
    username: session.username,
    email: session.email,
    password,
  });
  sessionStore.clearSession(ctx.from.id);
  return showMainMenu(ctx, `✅ Tabriklaymiz, ${result.user.username}! Ro'yxatdan o'tdingiz.`);
}

// Email band bo'lsa — parol tekshirilib, tg akkaunt o'sha hisobga bog'lanadi (login)
async function finishLogin(ctx, session, password) {
  const result = await api.tgLogin({
    tgId: ctx.from.id,
    username: session.username,
    email: session.email,
    password,
  });
  sessionStore.clearSession(ctx.from.id);
  return showMainMenu(
    ctx,
    `✅ Xush kelibsiz! "${session.email}" hisobiga kirdingiz.\nTelegram akkauntingiz shu hisob bilan bog'landi.`
  );
}

// ---------- 2) Kirim/Chiqim kiritish oxiri ----------

// Tur tanlash so'raladi
async function startTransactionFlow(ctx) {
  return ctx.reply("➕ Qaysi turdagi operatsiya?", {
    reply_markup: kb.transactionTypeKeyboard(),
  });
}

// Tur tanlandi -> kategoriya tanlash
async function pickTxType(ctx, type) {
  const tgId = ctx.from.id;
  const categories = (await api.getCategories(tgId, type)).data;

  sessionStore.setSession(tgId, { step: "tx_category", type, categories });
  const hint = categories.length === 0 ? "\n\n(hozircha kategoriya yo'q — 'Kategoriasiz' tanlashingiz mumkin)" : "";
  return editOrReply(ctx, `Kategoriya tanlang:${hint}`, {
    reply_markup: kb.transactionCategoriesKeyboard(categories),
  });
}

// Kategoriya tanlandi -> summa so'raladi
async function pickTxCategory(ctx, categoryIdOrNone) {
  const tgId = ctx.from.id;
  const session = sessionStore.getSession(tgId);
  if (!session || session.step !== "tx_category") {
    return ctx.reply("Avval tur tanlang.");
  }

  const categoryId = categoryIdOrNone === "none" ? null : Number(categoryIdOrNone);
  const category = (session.categories || []).find((c) => c.id === categoryId);
  const categoryTitle = category ? `${category.title} (${typeLabel(category.type)})` : "Kategorisiz";

  sessionStore.setSession(tgId, { ...session, step: "tx_amount", categoryId, categoryTitle });
  return editOrReply(ctx, `Kategoriya: ${categoryTitle}\n\nSummani kiriting (so'm, masalan 50000):`, {
    reply_markup: kb.removeInlineKeyboard(),
  });
}

// Izoh qoldirish bosqichidan keyin tranzaksiyani backend'ga yuborish
async function saveTransaction(ctx, session, comment) {
  await api.createTransaction(ctx.from.id, {
    category_id: session.categoryId,
    amount: session.amount,
    type: session.type,
    comment,
  });
  sessionStore.clearSession(ctx.from.id);
  return ctx.reply(
    `✅ ${typeLabel(session.type)} qayd etildi!\n\n` +
      `Kategoriya: ${session.categoryTitle}\n` +
      `Summa: ${formatMoney(session.amount)} so'm\n` +
      `Izoh: ${comment || "-"}`
  );
}

// ---------- 3) Byudjet limiti ----------

async function startBudgetFlow(ctx) {
  const tgId = ctx.from.id;
  const categories = (await api.getCategories(tgId)).data;

  sessionStore.setSession(tgId, { step: "budget_category", categories });
  const hint = categories.length === 0 ? "\n\n(Avval '📂 Kategoriyalar' bo'limida kategoriya qo'shing.)" : "";
  return ctx.reply(`🎯 Byudjet limiti uchun kategoriya tanlang:${hint}`, {
    reply_markup: kb.budgetCategoriesKeyboard(categories),
  });
}

async function pickBudgetCategory(ctx, categoryId) {
  const tgId = ctx.from.id;
  const session = sessionStore.getSession(tgId);
  if (!session || session.step !== "budget_category") {
    return ctx.reply("Avval kategoriya tanlang.");
  }

  const id = Number(categoryId);
  const category = (session.categories || []).find((c) => c.id === id);
  if (!category) return ctx.reply("Kategoriya topilmadi.");

  const { month, year } = currentMonthYear();
  sessionStore.setSession(tgId, {
    ...session,
    step: "budget_amount",
    categoryId: id,
    categoryTitle: category.title,
    month,
    year,
  });
  return editOrReply(
    ctx,
    `${category.title} uchun "${MONTHS_UZ[month - 1]} ${year}" oylik limitini kiriting (so'm, masalan 500000):`,
    { reply_markup: kb.removeInlineKeyboard() }
  );
}

async function saveBudget(ctx, session, limitAmount) {
  await api.setBudget(ctx.from.id, {
    category_id: session.categoryId,
    limit_amount: limitAmount,
    month: session.month,
    year: session.year,
  });
  sessionStore.clearSession(ctx.from.id);
  return ctx.reply(
    `✅ Byudjet limiti saqlandi!\n\n` +
      `Kategoriya: ${session.categoryTitle}\n` +
      `Limit: ${formatMoney(limitAmount)} so'm (${MONTHS_UZ[session.month - 1]} ${session.year})`
  );
}

// ---------- 4) Kategoriyalar ----------

async function showCategories(ctx) {
  const tgId = ctx.from.id;
  const categories = (await api.getCategories(tgId)).data;

  const lines =
    categories
      .map((c) => `• ${c.title} — ${typeLabel(c.type)}`)
      .join("\n") || "(kategoriyalar mavjud emas)";

  return ctx.reply(`📂 Kategoriyalar:\n\n${lines}\n\nQuyidagilardan birini tanlang:`, {
    reply_markup: kb.categoryActionsKeyboard(),
  });
}

async function startAddCategory(ctx) {
  const tgId = ctx.from.id;
  sessionStore.setSession(tgId, { step: "cat_add_title" });
  return editOrReply(ctx, "Yangi kategoriya nomini kiriting (maksimal 50 belgi):", {
    reply_markup: kb.removeInlineKeyboard(),
  });
}

async function pickCategoryType(ctx, type) {
  const tgId = ctx.from.id;
  const session = sessionStore.getSession(tgId);
  if (!session || session.step !== "cat_add_type") {
    return ctx.reply("Avval kategoriya nomini kiriting.");
  }

  const saved = (await api.createCategory(tgId, { title: session.catTitle, type })).data;
  sessionStore.clearSession(tgId);
  return ctx.reply(`✅ Kategoriya qo'shildi: "${saved.title}" (${typeLabel(saved.type)})`);
}

// ---------- 5) Statistika va AI maslahat ----------

async function showStats(ctx) {
  const result = await api.getSummary(ctx.from.id);
  return ctx.reply(
    `📊 Oylik statistika (${MONTHS_UZ[result.month - 1]} ${result.year}):\n\n` +
      `➕ Kirim:  ${formatMoney(result.income)} so'm\n` +
      `➖ Chiqim: ${formatMoney(result.expense)} so'm\n` +
      `💼 Balans: ${formatMoney(result.balance)} so'm`
  );
}

async function showAIAdvice(ctx) {
  await ctx.reply("⏳ AI maslahat tayyorlanmoqda, biroz kuting...");
  const result = await api.getAIAdvice(ctx.from.id);
  return ctx.reply(`💡 AI Maslahat:\n\n${result.advice}`);
}

// ---------- Sessiya bosqichlariga matn kiritish ----------

async function handleSessionInput(ctx, session) {
  const text = (ctx.message?.text || "").trim();
  const tgId = ctx.from.id;

  switch (session.step) {
    // Auth: 1-qadam email (darhol band yoki bo'sh ekani tekshiriladi)
    case "auth_email": {
      if (!EMAIL_RE.test(text)) {
        return ctx.reply("❌ Email formati noto'g'ri (masalan: user@mail.uz).\nQayta kiriting:");
      }
      const email = text.toLowerCase();

      // Email band bo'lsa -> login rejimi, bo'sh bo'lsa -> register rejimi.
      let exists = false;
      try {
        const check = await api.tgEmailCheck(tgId, email);
        exists = Boolean(check.exists);
      } catch {
        // Tekshiruv xatosida har qanday holatda register rejimida davom etamiz
      }

      sessionStore.setSession(tgId, { ...session, step: "auth_password", email, mode: exists ? "login" : "register" });
      return ctx.reply(
        exists
          ? "✅ Email topildi.\n\nBu email oldin ro'yxatdan o'tgan — tizimga kirish uchun parolingizni kiriting:"
          : "✅ Email qabul qilindi.\n\n2-qadam: Parol yarating (kamida 6 belgi):"
      );
    }

    // Auth: 2-qadam parol -> login (band email) yoki register (bo'sh email)
    case "auth_password": {
      if (session.mode === "login") {
        try {
          return await finishLogin(ctx, session, text);
        } catch (err) {
          // Parol noto'g'ri bo'lsa — qayta so'raymiz (sessiyani buzmaymiz)
          if (err instanceof BotApiError && err.status === 401) {
            return ctx.reply("❌ Parol noto'g'ri. Qayta urinib ko'ring:");
          }
          sessionStore.clearSession(tgId);
          return handleError(ctx, err);
        }
      }

      if (text.length < 6) {
        return ctx.reply("❌ Parol kamida 6 belgidan iborat bo'lishi kerak.\nQayta kiriting:");
      }
      try {
        return await finishRegistration(ctx, session, text);
      } catch (err) {
        // Email qandaydir sabab bilan band bo'lib qolgan (409) — login rejimiga o'tamiz
        if (err instanceof BotApiError && err.status === 409) {
          sessionStore.setSession(tgId, {
            ...session,
            mode: "login",
          });
          return ctx.reply("⚠️ Bu email allaqachon ro'yxatdan o'tgan.\nTizimga kirish uchun parolingizni kiriting:");
        }
        sessionStore.clearSession(tgId);
        return handleError(ctx, err);
      }
    }

    // Tranzaksiya: summa
    case "tx_amount": {
      const amount = parseAmount(text);
      if (amount === null) {
        return ctx.reply("❌ Summa musbat son bo'lishi kerak (masalan: 50000 yoki 50 000).\nQayta kiriting:");
      }
      sessionStore.setSession(tgId, { ...session, step: "tx_comment", amount });
      return ctx.reply(
        `✅ Summa: ${formatMoney(amount)} so'm\n\nEndi izoh yozing yoki o'tkazib yuborish uchun /skip bosing:`
      );
    }

    // Tranzaksiya: izoh (yoki /skip)
    case "tx_comment": {
      try {
        return await saveTransaction(ctx, session, text === "/skip" ? null : text);
      } catch (err) {
        sessionStore.clearSession(tgId);
        return handleError(ctx, err);
      }
    }

    // Byudjet: limit summasi
    case "budget_amount": {
      const limitAmount = parseAmount(text);
      if (limitAmount === null) {
        return ctx.reply("❌ Limit musbat son bo'lishi kerak (masalan: 500000).\nQayta kiriting:");
      }
      try {
        return await saveBudget(ctx, session, limitAmount);
      } catch (err) {
        sessionStore.clearSession(tgId);
        return handleError(ctx, err);
      }
    }

    // Kategoriya: nom
    case "cat_add_title": {
      const title = text.trim();
      if (!title || title.length > 50) {
        return ctx.reply("❌ Kategoriya nomi 1-50 belgidan iborat bo'lishi kerak.\nQayta kiriting:");
      }
      sessionStore.setSession(tgId, { ...session, step: "cat_add_type", catTitle: title });
      return ctx.reply("Kategoriya turini tanlang:", { reply_markup: kb.categoryTypeKeyboard() });
    }

    default:
      sessionStore.clearSession(tgId);
      return showMainMenu(ctx, "Asosiy menyu:");
  }
}

// ---------- Matn xabarlari dastlabki dispatcher ----------

async function handleMessage(ctx) {
  const text = (ctx.message?.text || "").trim();
  const tgId = ctx.from?.id;
  if (!tgId) return;

  // Asosiy menyu tugmalari
  const menuHandlers = {
    "➕ Kirim/Chiqim kiritish": () => startTransactionFlow(ctx),
    "📊 Oylik Statistika": () => showStats(ctx),
    "🎯 Byudjet Limiti": () => startBudgetFlow(ctx),
    "📂 Kategoriyalar": () => showCategories(ctx),
    "💡 AI Maslahat": () => showAIAdvice(ctx),
  };

  try {
    const menuHandler = menuHandlers[text];
    if (menuHandler) {
      // Yangi bo'lim ochilganda eski dialog to'xtatiladi
      sessionStore.clearSession(tgId);
      return await menuHandler();
    }

    const session = sessionStore.getSession(tgId);
    if (session) {
      return await handleSessionInput(ctx, session);
    }

    return ctx.reply("Bot ishlatish uchun /start buyrug'ini bosing yoki asosiy menyudan foydalaning.");
  } catch (err) {
    return handleError(ctx, err);
  }
}

// ---------- Inline callback dispatcher ----------

async function handleCallback(ctx) {
  const data = ctx.callbackQuery?.data;
  const tgId = ctx.from?.id;
  if (!data || !tgId) return;

  await ctx.answerCallbackQuery();

  try {
    if (data === "cancel") {
      sessionStore.clearSession(tgId);
      return ctx.reply("Bekor qilindi. ✅ Asosiy menyuda davom eting.");
    }
    if (data.startsWith("tx:type:")) return pickTxType(ctx, data.split(":")[2]);
    if (data.startsWith("tx:cat:")) return pickTxCategory(ctx, data.split(":")[2]);
    if (data.startsWith("budget:cat:")) return pickBudgetCategory(ctx, data.split(":")[2]);
    if (data === "cat:add") return startAddCategory(ctx);
    if (data.startsWith("cat:type:")) return pickCategoryType(ctx, data.split(":")[2]);
  } catch (err) {
    return handleError(ctx, err);
  }
}

// ---------- Botni ishga tushirish ----------

export function startBot() {
  if (!token || !started) {
    console.log(
      "Telegram bot o'chirilgan (TELEGRAM_BOT_TOKEN/BOT_TOKEN yoki TELEGRAM_BOT_ENABLED sozlanmagan)"
    );
    return null;
  }

  const bot = new Bot(token);

  bot.on("error", (err) => {
    console.error("Telegram bot transport xatosi:", err.message);
  });

  // Har qanday handler xatosida log + foydalanuvchiga chatbot darajasida xabar
  bot.catch((err) => {
    console.error("Bot handler xatosi:", err.message);
  });

  // Komandalar (filter middleware — registratsiya tartibi muhim)
  bot.command("start", (ctx) => handleStart(ctx));
  bot.command("cancel", (ctx) => handleCancel(ctx));

  // Oddiy matnlar va inline tugmalar
  bot.on("message", (ctx) => handleMessage(ctx));
  bot.on("callback_query", (ctx) => handleCallback(ctx));

  bot.startPolling().catch((err) => {
    console.error("Telegram polling to'xtadi:", err.message);
  });

  console.log("Telegram bot ishga tushdi");
  return bot;
}