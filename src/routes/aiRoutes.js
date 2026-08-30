import { Router } from "express";
import { getAIAdvice } from "../controllers/aiController.js";
import { anyAuthMiddleware } from "../middlewares/anyAuthMiddleware.js";

const router = Router();

router.use(anyAuthMiddleware);

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI moliya maslahat assistenti
 */

/**
 * @swagger
 * /api/ai/advice:
 *   get:
 *     summary: Foydalanuvchi xarajatlari bo'yicha AI maslahat olish
 *     description: >
 *       Foydalanuvchining oylik xarajatlarini tahlil qilib AI maslahat generatsiya qiladi.
 *       Natija bazada keshlanadi — bir xil oy uchun qayta so'rovda AI API'ga yuborilmaydi
 *       (`cached: true` qaytadi).
 *     tags: [AI]
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
 *         description: AI maslahati (keshlangan bo'lishi mumkin)
 */
router.get("/advice", getAIAdvice);

export default router;
