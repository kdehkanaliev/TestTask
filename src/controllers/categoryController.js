import db from "../config/db.js";
import { ApiError } from "../middlewares/errorMiddleware.js";

export async function getCategories(req, res, next) {
  try {
    const { type } = req.query;
    const params = [req.user.id];
    let sql = "SELECT * FROM categories WHERE (user_id = $1 OR user_id IS NULL)";

    if (type) {
      params.push(type);
      sql += ` AND type = $${params.length}`;
    }
    sql += " ORDER BY id ASC";

    const result = await db.query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req, res, next) {
  try {
    const { title, type } = req.body;
    if (!title || !["income", "expense"].includes(type)) {
      throw new ApiError(400, "title va type (income/expense) talab qilinadi");
    }

    const result = await db.query(
      "INSERT INTO categories (user_id, title, type) VALUES ($1, $2, $3) RETURNING *",
      [req.user.id, title, type]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const { category_id } = req.params;
    const { title, type } = req.body;

    const existing = await db.query(
      "SELECT * FROM categories WHERE id = $1",
      [category_id]
    );
    const category = existing.rows[0];
    if (!category) {
      throw new ApiError(404, "Kategoriya topilmadi");
    }
    if (category.user_id !== req.user.id) {
      throw new ApiError(403, "Boshqa foydalanuvchining kategoriyasini tahrirlay olmaysiz");
    }

    const result = await db.query(
      "UPDATE categories SET title = COALESCE($1, title), type = COALESCE($2, type) WHERE id = $3 RETURNING *",
      [title, type, category_id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const { category_id } = req.params;

    const existing = await db.query(
      "SELECT * FROM categories WHERE id = $1",
      [category_id]
    );
    const category = existing.rows[0];
    if (!category) {
      throw new ApiError(404, "Kategoriya topilmadi");
    }
    if (category.user_id !== req.user.id) {
      throw new ApiError(403, "Boshqa foydalanuvchining kategoriyasini o'chira olmaysiz");
    }

    await db.query("DELETE FROM categories WHERE id = $1", [category_id]);
    res.json({ success: true, message: "Kategoriya o'chirildi" });
  } catch (err) {
    next(err);
  }
}
