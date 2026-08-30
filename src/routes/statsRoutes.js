import { Router } from "express";
import {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrend,
} from "../controllers/statsController.js";
import { anyAuthMiddleware } from "../middlewares/anyAuthMiddleware.js";

const router = Router();

router.use(anyAuthMiddleware);

/**
 * @swagger
 * tags:
 *   name: Stats
 *   description: Statistika va tahlil
 */

/**
 * @swagger
 * /api/stats/summary:
 *   get:
 *     summary: Tanlangan oy uchun umumiy kirim, chiqim va balans
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, example: 8 }
 *       - in: query
 *         name: year
 *         schema: { type: integer, example: 2026 }
 *     responses:
 *       200:
 *         description: Umumiy statistika
 */

/**
 * @swagger
 * /api/stats/categories:
 *   get:
 *     summary: Chiqimlarning kategoriyalar bo'yicha foiz taqsimoti
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, example: 8 }
 *       - in: query
 *         name: year
 *         schema: { type: integer, example: 2026 }
 *     responses:
 *       200:
 *         description: Kategoriya foiz taqsimoti
 */

/**
 * @swagger
 * /api/stats/monthly-trend:
 *   get:
 *     summary: Kunbay, haftabay yoki oybay kirim-chiqim dinamikasi
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupBy
 *         schema: { type: string, enum: [daily, weekly, monthly], default: monthly }
 *     responses:
 *       200:
 *         description: Trend ma'lumoti
 */
router.get("/summary", getSummary);
router.get("/categories", getCategoryBreakdown);
router.get("/monthly-trend", getMonthlyTrend);

export default router;
