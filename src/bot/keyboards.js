// Telegram tugmalari (reply + inline) quruvchi yordamchi modul.
// Markup obyektlari oddiy plain object sifatida quriladi — node-telegram-bot-api
// ularni to'g'ridan-to'g'ri serialize qiladi (README § Keyboards & formatting).

// Asosiy menyu (doimiy reply keyboard)
export function mainMenu() {
  return {
    keyboard: [
      [
        { text: "➕ Kirim/Chiqim kiritish" },
        { text: "📊 Oylik Statistika" },
      ],
      [
        { text: "🎯 Byudjet Limiti" },
        { text: "📂 Kategoriyalar" },
      ],
      [
        { text: "💡 AI Maslahat" },
      ],
    ],
    resize_keyboard: true,
  };
}

// Kirim/chiqim turini tanlash (inline)
export function transactionTypeKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "💰 Kirim", callback_data: "tx:type:income" },
        { text: "💸 Chiqim", callback_data: "tx:type:expense" },
      ],
      [{ text: "❌ Bekor qilish", callback_data: "cancel" }],
    ],
  };
}

// Kategoriyalarni 2 tadan inline tugmaga joylash.
function categoryRows(categories, prefix) {
  const rows = [];
  let row = [];

  categories.forEach((category) => {
    row.push({ text: category.title, callback_data: `${prefix}:${category.id}` });
    if (row.length === 2) {
      rows.push(row);
      row = [];
    }
  });

  if (row.length > 0) rows.push(row);
  return rows;
}

// Tranzaksiya uchun kategoriyalar ro'yxati + "kategoriasiz" varianti.
export function transactionCategoriesKeyboard(categories = []) {
  return {
    inline_keyboard: [
      ...categoryRows(categories, "tx:cat"),
      [{ text: "➖ Kategoriasiz", callback_data: "tx:cat:none" }],
      [{ text: "❌ Bekor qilish", callback_data: "cancel" }],
    ],
  };
}

// Byudjet uchun kategoriyalar ro'yxati.
export function budgetCategoriesKeyboard(categories = []) {
  return {
    inline_keyboard: [
      ...categoryRows(categories, "budget:cat"),
      [{ text: "❌ Bekor qilish", callback_data: "cancel" }],
    ],
  };
}

// Kategoriyalar bo'limining boshqaruv tugmalari
export function categoryActionsKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "➕ Yangi kategoriya qo'shish", callback_data: "cat:add" }],
      [{ text: "❌ Bekor qilish", callback_data: "cancel" }],
    ],
  };
}

// Yangi kategoriya turini tanlash (income/expense)
export function categoryTypeKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "💰 Kirim", callback_data: "cat:type:income" },
        { text: "💸 Chiqim", callback_data: "cat:type:expense" },
      ],
      [{ text: "❌ Bekor qilish", callback_data: "cancel" }],
    ],
  };
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