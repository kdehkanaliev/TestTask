import db from "../config/db.js";
import { ApiError } from "../middlewares/errorMiddleware.js";
import { isValidPositiveNumber } from "../utils/validation.js";

export async function setBudget(req, res, next) {
  try {
    const { category_id, limit_amount, month, year } = req.body;

    if (!isValidPositiveNumber(category_id)) {
      throw new ApiError(400, "category_id talab qilinadi");
    }
    if (!isValidPositiveNumber(limit_amount)) {
      throw new ApiError(400, "limit_amount musbat son bo'lishi kerak");
    }
    if (!isValidPositiveNumber(month) || !isValidPositiveNumber(year)) {
      throw new ApiError(400, "month va year talab qilinadi");
    }
    if (month < 1 || month > 12) {
      throw new ApiError(400, "month 1-12 oralig'ida bo'lishi kerak");
    }

    const numericCategoryId = parseInt(category_id, 10);
    const numericLimit = Number(limit_amount);
    const numericMonth = parseInt(month, 10);
    const numericYear = parseInt(year, 10);

    const cat = await db.query(
      "SELECT * FROM categories WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)",
      [numericCategoryId, req.user.id]
    );
    if (!cat.rows[0]) {
      throw new ApiError(400, "Kategoriya topilmadi");
    }

    const result = await db.query(
      `INSERT INTO budgets (user_id, category_id, limit_amount, month, year)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, category_id, month, year)
       DO UPDATE SET limit_amount = EXCLUDED.limit_amount
       RETURNING *`,
      [req.user.id, numericCategoryId, numericLimit, numericMonth, numericYear]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function getBudgetStatus(req, res, next) {
  try {
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    const result = await db.query(
      `SELECT b.id, b.month, b.year, b.limit_amount,
              c.title AS category_title,
              COALESCE(SUM(
                CASE WHEN t.type = 'expense' AND t.deleted_at IS NULL
                     THEN t.amount ELSE 0 END
              ), 0) AS spent,
              b.limit_amount AS limitx
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       LEFT JOIN transactions t
         ON t.category_id = b.category_id
        AND t.user_id = b.user_id
        AND EXTRACT(MONTH FROM t.created_at) = b.month
        AND EXTRACT(YEAR FROM t.created_at) = b.year
       WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
       GROUP BY b.id, c.title, b.limit_amount, b.month, b.year`,
      [req.user.id, month, year]
    );

    const data = result.rows.map((b) => {
      const spent = parseFloat(b.spent);
      const limitAmount = parseFloat(b.limit_amount);
      const percent = limitAmount > 0 ? Math.min((spent / limitAmount) * 100, 100) : 0;
      return {
        id: b.id,
        category_title: b.category_title,
        limit_amount: limitAmount,
        spent,
        remaining: Math.max(limitAmount - spent, 0),
        percent: Math.round(percent * 100) / 100,
      };
    });

    res.json({ success: true, month, year, data });
  } catch (err) {
    next(err);
  }
}
