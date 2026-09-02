import { Router } from "express";
import {
  register,
  login,
  tgCheck,
  tgEmailCheck,
  tgLogin,
  tgRegister,
  updateUser,
  softDeleteUser,
  refreshToken,
  logout,
} from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Avtorizatsiya va foydalanuvchi boshqaruvi
 */

/**
 * @swagger
 * /api/users/auth/register:
 *   post:
 *     summary: Yangi foydalanuvchi ro'yxatdan o'tkazish
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string, example: "alisher" }
 *               email: { type: string, example: "alisher@mail.uz" }
 *               password: { type: string, format: password, example: "secret123" }
 *     responses:
 *       201:
 *         description: Foydalanuvchi yaratildi
 *       409:
 *         description: Email allaqachon ro'yxatdan o'tgan
 */
router.post("/users/auth/register", register);

/**
 * @swagger
 * /api/users/auth/login:
 *   post:
 *     summary: Foydalanuvchini tizimga kiritish
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "alisher@mail.uz" }
 *               password: { type: string, format: password, example: "secret123" }
 *     responses:
 *       200:
 *         description: Muvaffaqiyatli login
 *       401:
 *         description: Email yoki parol noto'g'ri
 */
router.post("/users/auth/login", login);

/**
 * @swagger
 * /api/users/auth/tg-check:
 *   get:
 *     summary: Telegram foydalanuvchisi tizimda bor-yo'qligini tekshirish
 *     description: >
 *       Bot `/start` bosilganda ushbu endpointni chaqiradi. So'rov `x-tg-id`
 *       headeri bilan keladi (alternativalari: `tg_id` query yoki body).
 *       `registered: true` bo'lsa foydalanuvchi ro'yxatdan o'tgan.
 *     tags: [Auth]
 *     parameters:
 *       - in: header
 *         name: x-tg-id
 *         schema: { type: integer, example: 123456789 }
 *         description: Telegram user ID
 *     responses:
 *       200:
 *         description: Natija (registered true/false va user ma'lumoti)
 *       400:
 *         description: tg_id kiritilmagan yoki noto'g'ri
 */
router.get("/users/auth/tg-check", tgCheck);

/**
 * @swagger
 * /api/users/auth/tg-email-check:
 *   post:
 *     summary: Email band yoki bo'shligini tekshirish
 *     description: >
 *       Bot ro'yxatdan o'tishning 1-qadamida (email kiritilgach) ushbu
 *       endpointni chaqiradi. `exists: true` bo'lsa bot login rejimiga o'tadi,
 *       aks holda register davom etadi.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: "user@mail.uz" }
 *     responses:
 *       200:
 *         description: "exists: true/false"
 *       400:
 *         description: Email formati noto'g'ri
 */
router.post("/users/auth/tg-email-check", tgEmailCheck);

/**
 * @swagger
 * /api/users/auth/tg-login:
 *   post:
 *     summary: Avval ro'yxatdan o'tgan email bilan Telegram orqali kirish
 *     description: >
 *       Email band bo'lsa bot parol so'raydi va parol tasdiqlangach bu endpoint
 *       orqali tg_id email hisobiga bog'lanadi (login).
 *       Parol noto'g'ri bo'lsa 401 qaytadi.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tg_id, email, password]
 *             properties:
 *               tg_id: { type: integer, example: 123456789 }
 *               username: { type: string, example: "alisher_tg" }
 *               email: { type: string, example: "alisher@mail.uz" }
 *               password: { type: string, format: password, example: "secret123" }
 *               initData: { type: string }
 *     responses:
 *       200:
 *         description: Muvaffaqiyatli login va tg_id bog'landi
 *       400:
 *         description: Ma'lumotlar noto'g'ri
 *       401:
 *         description: Email yoki parol noto'g'ri
 */
router.post("/users/auth/tg-login", tgLogin);

/**
 * @swagger
 * /api/users/auth/tg-register:
 *   post:
 *     summary: Telegram orqali foydalanuvchini yaratish yoki sinxronlash
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tg_id]
 *             properties:
 *               tg_id: { type: integer, example: 123456789 }
 *               username: { type: string, example: "alisher_tg" }
 *               initData: { type: string, description: "Telegram WebApp initData (bot token sozlanganida tekshiriladi)" }
 *     responses:
 *       200:
 *         description: Foydalanuvchi sinxronlashtirildi
 */
router.post("/users/auth/tg-register", tgRegister);

/**
 * @swagger
 * /api/users/auth/refresh:
 *   post:
 *     summary: Refresh token orqali yangi access token olish
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string, description: "Login/registerda qaytgan refresh token" }
 *     responses:
 *       200:
 *         description: Yangi tokenlar berildi
 *       401:
 *         description: Yaroqsiz yoki muddati o'tgan refresh token
 */
router.post("/users/auth/refresh", refreshToken);

/**
 * @swagger
 * /api/users/auth/logout:
 *   post:
 *     summary: Foydalanuvchini tizimdan chiqarish
 *     tags: [Auth]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Muvaffaqiyatli chiqish
 */
router.post("/users/auth/logout", logout);

/**
 * @swagger
 * /api/users/{user_id}:
 *   patch:
 *     summary: Foydalanuvchi profilini tahrirlash
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               email: { type: string }
 *               password: { type: string, format: password }
 *               currency: { type: string, example: "UZS" }
 *     responses:
 *       200:
 *         description: Profil yangilandi
 *       403:
 *         description: Faqat o'z profilini tahrirlash mumkin
 */
router.patch("/users/:user_id", authMiddleware, updateUser);

/**
 * @swagger
 * /api/users/delete/{user_id}:
 *   patch:
 *     summary: Foydalanuvchini soft-delete qilish
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Foydalanuvchi o'chirildi
 */
router.patch("/users/delete/:user_id", authMiddleware, softDeleteUser);

export default router;
