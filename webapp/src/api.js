import axios from "axios";
import TelegramWebApp from "@twa-dev/sdk";

/*
  Axios instansi — barcha REST so'rovlar xavfsizligi
  Telegram initData orqali ta'minlanadi.
  Har bir so'rovga `x-telegram-init-data` header'i avtomatik qo'shiladi,
  backend shu header orqali foydalanuvchini aniqlaydi va autentifikatsiya qiladi.
*/
export const API_BASE_URL =
  "https://testtask-production-cb97.up.railway.app/api";

// initData manbai: Telegram WebApp yoki (dev brauzerda test qilish uchun) URL parametri.
export function getInitData() {
  const initData = TelegramWebApp.initData;
  if (initData) return initData;
  const params = new URLSearchParams(window.location.search);
  return params.get("initData") || "";
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: initData header'ini qo'shish.
api.interceptors.request.use((config) => {
  const initData = getInitData();
  if (initData) {
    config.headers["x-telegram-init-data"] = initData;
  }
  return config;
});

// Response interceptor: backend hujjatidagi { success, data } strukturasini
// normalizatsiya qilamiz va xatoliklarni qulay tilimiz (message) bilan qaytaramiz.
api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const message =
      error.response?.data?.message || error.message || "Xatolik yuz berdi";
    const normalized = new Error(message, { cause: error });
    normalized.status = error.response?.status;
    normalized.raw = error.response?.data;
    return Promise.reject(normalized);
  },
);

export const statsApi = {
  summary: (params) => api.get("/stats/summary", { params }),
  categories: (params) => api.get("/stats/categories", { params }),
  // groupBy: daily | weekly | monthly
  trend: (params) => api.get("/stats/monthly-trend", { params }),
};

export const transactionsApi = {
  list: (params) => api.get("/transactions", { params }),
  remove: (id) => api.delete(`/transactions/${id}`),
};
