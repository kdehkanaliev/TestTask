/*
  Formatlash va kategoriya meta-ma'lumotlari.
  Kategoriyalar bazada faqat `title` ga ega, shuning uchun
  UI uchun icon/foo rangni shu yerda xaritadan olamiz.
*/

export function formatMoney(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(
    amount
  );
}

export const MONTHS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];

export function formatPeriod(period) {
  const d = new Date(period);
  if (Number.isNaN(d.getTime())) return String(period);
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "hozirgina";
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} kun oldin`;
  return new Date(iso).toLocaleDateString("uz-UZ");
}

// Kategoriya nomi -> emoji icon
const CATEGORY_ICONS = {
  "Oziq-ovqat": "🛒",
  "Transport": "🚗",
  "Uy-joy": "🏠",
  "Sog'liq": "💊",
  "Ta'lim": "📚",
  "O'yin-kulgi": "🎮",
  "Kiyim-kechak": "👕",
  "Hisob-kitob": "🧾",
  "Maosh": "💰",
  "Freelans": "💻",
  "Biznes": "📈",
  "Boshqa": "📦",
};

export function categoryIcon(title) {
  return CATEGORY_ICONS[title] || "📦";
}

const CATEGORY_COLORS = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ef4444",
  "#f59e0b",
  "#14b8a6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

// Bir xil kategoriya har doim bir xil rangga ega bo'lishi uchun xesh.
export function categoryColor(title) {
  const source = title || "Boshqa";
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}