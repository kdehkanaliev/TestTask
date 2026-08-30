import { Router } from "express";
import {
  createTransaction,
  getTransactions,
  deleteTransaction,
} from "../controllers/transactionController.js";
import { anyAuthMiddleware } from "../middlewares/anyAuthMiddleware.js";

const router = Router();

router.use(anyAuthMiddleware);

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Kirim-chiqim tranzaksiyalari
 */

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Yangi tranzaksiya yozish (kirim yoki chiqim)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type]
 *             properties:
 *               category_id: { type: integer, description: "Kategoriya ID (ixtiyoriy)" }
 *               amount: { type: number, example: 50000 }
 *               type: { type: string, enum: [income, expense], example: "expense" }
 *               comment: { type: string, example: "tushlik" }
 *     responses:
 *       201:
 *         description: Tranzaksiya yaratildi
 *   get:
 *     summary: Foydalanuvchining tranzaksiyalari (paginatsiya bilan)
 *     tags: [Transactions]
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
 *         name: month
 *         schema: { type: integer, example: 8 }
 *         description: Oy (1-12)
 *       - in: query
 *         name: year
 *         schema: { type: integer, example: 2026 }
 *     responses:
 *       200:
 *         description: Tranzaksiyalar ro'yxati
 */

/**
 * @swagger
 * /api/transactions/{id}:
 *   delete:
 *     summary: Tranzaksiyani o'chirish (soft-delete)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Tranzaksiya o'chirildi
 *       404:
 *         description: Tranzaksiya topilmadi
 */
router.post("/", createTransaction);
router.get("/", getTransactions);
router.delete("/:id", deleteTransaction);

export default router;
