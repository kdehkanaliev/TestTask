import { Router } from "express";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { anyAuthMiddleware } from "../middlewares/anyAuthMiddleware.js";

const router = Router();

router.use(anyAuthMiddleware);

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Kategoriyalar boshqaruvi
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Barcha kategoriyalar ro'yxati
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *         description: "Faqat ma'lum turdagi kategoriyalar (ixtiyoriy)"
 *     responses:
 *       200:
 *         description: Kategoriyalar ro'yxati
 *   post:
 *     summary: Yangi kategoriya yaratish
 *     tags: [Categories]
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
 *               title: { type: string, example: "Oziq-ovqat" }
 *               type: { type: string, enum: [income, expense], example: "expense" }
 *     responses:
 *       201:
 *         description: Kategoriya yaratildi
 */

/**
 * @swagger
 * /api/categories/{category_id}:
 *   patch:
 *     summary: Kategoriyani tahrirlash
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category_id
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
 *   delete:
 *     summary: Kategoriyani o'chirish
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Kategoriya o'chirildi
 */
router.get("/", getCategories);
router.post("/", createCategory);
router.patch("/:category_id", updateCategory);
router.delete("/:category_id", deleteCategory);

export default router;
