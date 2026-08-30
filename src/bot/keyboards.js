// Telegram tugmalari (reply + inline) quruvchi yordamchi modul.
// Barcha markup obyektlari node-telegram-bot-api builderlari yordamida quriladi.
import { InlineKeyboardBuilder, ReplyKeyboardBuilder } from "node-telegram-bot-api";

// "❌ Bekor qilish" tugmasini inline keyboard oxiriga qo'shadi.
function withCancel(builder) {
  builder.row().text("❌ Bekor qilish", "cancel");
  return builder.build();
}

// Asosiy menyu (doimiy reply keyboard)
export function mainMenu() {
  return new ReplyKeyboardBuilder()
    .text("➕ Kirim/Chiqim kiritish")
    .text("📊 Oylik Statistika")
    .row()
    .text("🎯 Byudjet Limiti")
    .text("📂 Kategoriyalar")
    .row()
    .text("💡 AI Maslahat")
    .build({ resize_keyboard: true });
}

// Kirim/chiqim turini tanlash (inline)
export function transactionTypeKeyboard() {
  return withCancel(
    new InlineKeyboardBuilder()
      .text("💰 Kirim", "tx:type:income")
      .text("💸 Chiqim", "tx:type:expense")
  );
}

// Tranzaksiya uchun kategoriyalar ro'yxati.
// Oxirida "kategoriasiz" va "bekor qilish" tugmalari bor.
export function transactionCategoriesKeyboard(categories) {
  const kb = new InlineKeyboardBuilder();
  categories.forEach((category, index) => {
    kb.text(category.title, `tx:cat:${category.id}`);
    if ((index + 1) % 2 === 0) kb.row();
  });
  kb.row().text("➖ Kategoriasiz", "tx:cat:none");
  return withCancel(kb);
}

// Byudjet uchun kategoriyalar ro'yxati
export function budgetCategoriesKeyboard(categories) {
  const kb = new InlineKeyboardBuilder();
  categories.forEach((category, index) => {
    kb.text(category.title, `budget:cat:${category.id}`);
    if ((index + 1) % 2 === 0) kb.row();
  });
  return withCancel(kb);
}

// Kategoriyalar bo'limining boshqaruv tugmalari
export function categoryActionsKeyboard() {
  return withCancel(new InlineKeyboardBuilder().text("➕ Yangi kategoriya qo'shish", "cat:add"));
}

// Yangi kategoriya turini tanlash (income/expense)
export function categoryTypeKeyboard() {
  return withCancel(
    new InlineKeyboardBuilder()
      .text("💰 Kirim", "cat:type:income")
      .text("💸 Chiqim", "cat:type:expense")
  );
}

// Inline keyboardni olib tashlash (keyingi oddiy matn prompti uchun)
export function removeInlineKeyboard() {
  return { inline_keyboard: [] };
}

export default {
  mainMenu,
  transactionTypeKeyboard,
  transactionCategoriesKeyboard,
  budgetCategoriesKeyboard,
  categoryActionsKeyboard,
  categoryTypeKeyboard,
  removeInlineKeyboard,
};