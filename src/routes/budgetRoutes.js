import { Router } from "express";
import {
  setBudget,
  getBudgetStatus,
} from "../controllers/budgetController.js";
import { anyAuthMiddleware } from "../middlewares/anyAuthMiddleware.js";

const router = Router();

router.use(anyAuthMiddleware);

/**
 * @swagger
 * tags:
 *   name: Budgets
 *   description: Oylik byudjet limitlari
 */

/**
 * @swagger
 * /api/budgets:
 *   post:
 *     summary: Kategoriya uchun oylik limit belgilash
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category_id, limit_amount, month, year]
 *             properties:
 *               category_id: { type: integer }
 *               limit_amount: { type: number, example: 500000 }
 *               month: { type: integer, example: 8 }
 *               year: { type: integer, example: 2026 }
 *     responses:
 *       201:
 *         description: Limit belgilandi
 */

/**
 * @swagger
 * /api/budgets/status:
 *   get:
 *     summary: Limitlarning bajarilish foizi
 *     tags: [Budgets]
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
 *         description: Har bir limit bo'yicha sarf-foiz ma'lumoti
 */
router.post("/", setBudget);
router.get("/status", getBudgetStatus);

export default router;
