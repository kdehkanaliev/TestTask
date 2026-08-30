import db from "../config/db.js";
import { ApiError } from "../middlewares/errorMiddleware.js";
import { isValidPositiveNumber, clampInt } from "../utils/validation.js";

export async function createTransaction(req, res, next) {
  try {
    const { category_id, amount, type, comment } = req.body;

    if (!isValidPositiveNumber(amount)) {
      throw new ApiError(400, "amount musbat son bo'lishi kerak");
    }
    if (!["income", "expense"].includes(type)) {
      throw new ApiError(400, "type (income/expense) talab qilinadi");
    }
    if (comment && typeof comment !== "string") {
      throw new ApiError(400, "comment matn bo'lishi kerak");
    }
    if (typeof comment === "string" && comment.length > 500) {
      throw new ApiError(400, "comment 500 belgidan oshmasligi kerak");
    }
    if (category_id !== undefined && !isValidPositiveNumber(category_id)) {
      throw new ApiError(400, "category_id musbat butun son bo'lishi kerak");
    }

    const numericAmount = Number(amount);
    const numericCategoryId = category_id ? parseInt(category_id, 10) : null;

    if (numericCategoryId) {
      const cat = await db.query(
        "SELECT * FROM categories WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)",
        [numericCategoryId, req.user.id]
      );
      if (!cat.rows[0]) {
        throw new ApiError(400, "Kategoriya topilmadi yoki ushbu foydalanuvchiga tegishli emas");
      }
    }

    const result = await db.query(
      `INSERT INTO transactions (user_id, category_id, amount, type, comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, numericCategoryId, numericAmount, type, comment || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function getTransactions(req, res, next) {
  try {
    const page = clampInt(req.query.page, 1, 1, 1e6);
    const limit = clampInt(req.query.limit, 20, 1, 100);
    const offset = (page - 1) * limit;

    const { month, year } = req.query;
    const params = [req.user.id];
    const conditions = ["t.user_id = $1", "t.deleted_at IS NULL"];

    if (month) {
      params.push(parseInt(month, 10));
      conditions.push(`EXTRACT(MONTH FROM t.created_at) = $${params.length}`);
    }
    if (year) {
      params.push(parseInt(year, 10));
      conditions.push(`EXTRACT(YEAR FROM t.created_at) = $${params.length}`);
    }

    const where = conditions.join(" AND ");

    const result = await db.query(
      `SELECT t.*, c.title AS category_title
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE ${where}
       ORDER BY t.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const count = await db.query(
      `SELECT COUNT(*)::int AS total FROM transactions t WHERE ${where}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      total: count.rows[0].total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteTransaction(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await db.query(
      "SELECT * FROM transactions WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
      [id, req.user.id]
    );
    if (!existing.rows[0]) {
      throw new ApiError(404, "Tranzaksiya topilmadi");
    }

    await db.query(
      "UPDATE transactions SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
      [id]
    );

    res.json({ success: true, message: "Tranzaksiya o'chirildi (soft delete)" });
  } catch (err) {
    next(err);
  }
}
