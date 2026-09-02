// ============================================================
// adminRoutes — Admin panel marshrutlari
// ------------------------------------------------------------
// Barcha endpointlar /api/admin ostida. authMiddleware avval
// foydalanuvchini aniqlaydi, adminMiddleware esa faqat
// role === 'admin' bo'lganlarga ruxsat beradi (aks holda 403).
// ============================================================
import { Router } from "express";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";
import {
  getStats,
  getUsersList,
  setUserStatus,
  broadcast,
  getGlobalCategories,
  createGlobalCategory,
  updateGlobalCategory,
  deleteGlobalCategory,
} from "../controllers/adminController.js";

const router = Router();

// Barcha admin marshrutlar JWT auth + admin ruxsati talab qiladi.
router.use(authMiddleware, adminMiddleware);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Tizim analitikasi (admin)
 *     description: Jami userlar, shu oydagi yangi userlar, tranzaksiyalar, aylanma, AI so'rovlar va kunlik aktivlik.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *         description: Kunlik grafik uchun necha kun
 *     responses:
 *       200:
 *         description: Statistika
 *       403:
 *         description: Faqat adminlar uchun
 */
router.get("/stats", getStats);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Foydalanuvchilar ro'yxati (admin)
 *     description: Paginatsiya, qidiruv (email/tg_id/username) va role filter.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: email/tg_id/username bo'yicha qidiruv
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [user, admin] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, blocked, all], default: active }
 *     responses:
 *       200:
 *         description: Foydalanuvchilar ro'yxati
 *       403:
 *         description: Faqat adminlar uchun
 */
router.get("/users", getUsersList);

/**
 * @swagger
 * /api/admin/users/{id}/status:
 *   patch:
 *     summary: Foydalanuvchi statusini o'zgartirish (admin)
 *     description: Bloklash (soft-delete), qayta aktivlashtirish yoki rolni o'zgartirish.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [active, blocked] }
 *               role: { type: string, enum: [user, admin] }
 *     responses:
 *       200:
 *         description: Status yangilandi
 *       403:
 *         description: Faqat adminlar uchun
 */
router.patch("/users/:id/status", setUserStatus);

/**
 * @swagger
 * /api/admin/broadcast:
 *   post:
 *     summary: Ommaviy xabar yuborish (admin)
 *     description: Barcha faol foydalanuvchilarga Telegram orqali markdown/HTML xabar yuborish.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text: { type: string }
 *               parseMode: { type: string, enum: [Markdown, HTML], default: Markdown }
 *     responses:
 *       200:
 *         description: Broadcast yakunlandi
 *       403:
 *         description: Faqat adminlar uchun
 */
router.post("/broadcast", broadcast);

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Global kategoriyalar ro'yxati (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *     responses:
 *       200:
 *         description: Global kategoriyalar
 */
router.get("/categories", getGlobalCategories);

/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Global kategoriya yaratish (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type]
 *             properties:
 *               title: { type: string }
 *               type: { type: string, enum: [income, expense] }
 *     responses:
 *       201:
 *         description: Kategoriya yaratildi
 */
router.post("/categories", createGlobalCategory);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   patch:
 *     summary: Global kategoriyani tahrirlash (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               type: { type: string, enum: [income, expense] }
 *     responses:
 *       200:
 *         description: Kategoriya yangilandi
 */
router.patch("/categories/:id", updateGlobalCategory);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Global kategoriyani o'chirish (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Kategoriya o'chirildi
 */
router.delete("/categories/:id", deleteGlobalCategory);

export default router;
