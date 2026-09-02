// ============================================================
// adminController — Admin panel uchun kontrollerlar
// ------------------------------------------------------------
// Faqat role === 'admin' foydalanuvchilar uchun mo'ljallangan.
// Barcha funksiyalar adminMiddleware bilan himoyalangan bo'ladi.
//
// `is_active` ustuni yo'q, shu sababli bloklash soft-delete
// (deleted_at) orqali bajariladi: bloklash => deleted_at = NOW(),
// qayta aktivlash => deleted_at = NULL.
// ============================================================
import db from "../config/db.js";
import { ApiError } from "../middlewares/errorMiddleware.js";
import { sendBroadcast } from "../services/broadcastService.js";

function parseId(value, field = "id") {
  const id = parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, `${field} noto'g'ri`);
  }
  return id;
}

function clamp(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

// GET /api/admin/stats
// Tizim analitikasi: userlar, tranzaksiyalar, aylanma, AI so'rovlar, kunlik aktivlik.
export async function getStats(req, res, next) {
  try {
    const days = clamp(req.query.days, 7, 90, 30);

    const totalUsers = await db.query(
      `SELECT COUNT(*)::int AS total FROM users WHERE deleted_at IS NULL`
    );

    const newUsersThisMonth = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM users
       WHERE deleted_at IS NULL
         AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`
    );

    const transactionsMeta = await db.query(
      `SELECT COUNT(*)::int AS total,
              COALESCE(SUM(amount), 0)::float AS sum_amount,
              COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::float AS income,
              COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::float AS expense
       FROM transactions
       WHERE deleted_at IS NULL`
    );

    // AI so'rovlar (ai_advices cache jadvali proxy sifatida ishlatiladi)
    const aiRequests = await db.query(
      `SELECT COUNT(*)::int AS total FROM ai_advices`
    );

    // Kunlik aktivlik: oxirgi `days` kun ichida yangi userlar va tranzaksiyalar.
    const dailyActivity = await db.query(
      `WITH days AS (
         SELECT generate_series(
           CURRENT_DATE - ($1 || ' days')::interval,
           CURRENT_DATE,
           '1 day'::interval
         )::date AS day
       )
       SELECT days.day::text AS date,
              COALESCE(u.new_users, 0)::int AS new_users,
              COALESCE(t.tx_count, 0)::int AS transactions,
              COALESCE(t.tx_volume, 0)::float AS volume
       FROM days
       LEFT JOIN (
         SELECT DATE(created_at) AS day, COUNT(*)::int AS new_users
         FROM users WHERE deleted_at IS NULL
         GROUP BY DATE(created_at)
       ) u ON u.day = days.day
       LEFT JOIN (
         SELECT DATE(created_at) AS day,
                COUNT(*)::int AS tx_count,
                SUM(amount)::float AS tx_volume
         FROM transactions WHERE deleted_at IS NULL
         GROUP BY DATE(created_at)
       ) t ON t.day = days.day
       ORDER BY days.day ASC`,
      [days]
    );

    const tx = transactionsMeta.rows[0];
    res.json({
      success: true,
      data: {
        total_users: totalUsers.rows[0].total,
        new_users_this_month: newUsersThisMonth.rows[0].total,
        total_transactions: tx.total,
        turnover: parseFloat(tx.sum_amount),
        income: parseFloat(tx.income),
        expense: parseFloat(tx.expense),
        ai_requests: aiRequests.rows[0].total,
        daily: dailyActivity.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users
// Paginatsiya, qidiruv (email/tg_id) va role filter.
export async function getUsersList(req, res, next) {
  try {
    const page = clamp(req.query.page, 1, Number.MAX_SAFE_INTEGER, 1);
    const limit = clamp(req.query.limit, 1, 100, 20);
    const offset = (page - 1) * limit;

    const search = (req.query.search || "").trim();
    const role = (req.query.role || "").trim();
    const status = (req.query.status || "").trim(); // active | blocked | all

    const conditions = [];
    const params = [];

    // Qidiruv: email yoki tg_id yoki username bo'yicha.
    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(email ILIKE $${params.length} OR tg_id::text ILIKE $${params.length} OR username ILIKE $${params.length})`
      );
    }

    if (role && ["user", "admin"].includes(role)) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }

    if (status === "active") {
      conditions.push(`deleted_at IS NULL`);
    } else if (status === "blocked") {
      conditions.push(`deleted_at IS NOT NULL`);
    } else {
      // default: faqat faol (o'chirilmagan) foydalanuvchilar
      conditions.push(`deleted_at IS NULL`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await db.query(
      `SELECT COUNT(*)::int AS total FROM users ${where}`,
      params
    );

    const dataRes = await db.query(
      `SELECT id, tg_id, username, email, role, currency, created_at, deleted_at
       FROM users
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: dataRes.rows,
      total: countRes.rows[0].total,
      page,
      limit,
      total_pages: Math.ceil(countRes.rows[0].total / limit) || 1,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id/status
// Bloklash (soft-delete) / qayta aktivlashtirish. ± role o'zgartirish.
export async function setUserStatus(req, res, next) {
  try {
    const id = parseId(req.params.id, "id");
    const { status, role } = req.body;

    const target = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    const user = target.rows[0];
    if (!user) {
      throw new ApiError(404, "Foydalanuvchi topilmadi");
    }

    // O'zini o'zi bloklash yoki rolini o'zgartirishga yo'l qo'ymaymiz.
    if (user.id === req.user.id) {
      throw new ApiError(400, "O'z akkauntingizni bloklab / rolini o'zgartira olmaysiz");
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (status === "active") {
      updates.push(`deleted_at = NULL`);
    } else if (status === "blocked") {
      updates.push(`deleted_at = NOW()`);
    } else if (status !== undefined && status !== null) {
      throw new ApiError(400, "status 'active' yoki 'blocked' bo'lishi kerak");
    }

    if (role !== undefined && role !== null) {
      if (!["user", "admin"].includes(role)) {
        throw new ApiError(400, "role 'user' yoki 'admin' bo'lishi kerak");
      }
      // Oxirgi adminni "user" qilishga yo'l qo'ymaymiz.
      if (role === "user" && user.role === "admin") {
        const adminCount = await db.query(
          `SELECT COUNT(*)::int AS total FROM users WHERE role = 'admin' AND deleted_at IS NULL`
        );
        if (adminCount.rows[0].total <= 1) {
          throw new ApiError(400, "Kamida bitta admin qolishi shart");
        }
      }
      updates.push(`role = $${idx++}`);
      values.push(role);
    }

    if (!updates.length) {
      throw new ApiError(400, "Yangilash uchun status yoki role ko'rsating");
    }

    values.push(new Date());
    updates.push(`updated_at = $${idx++}`);

    values.push(id);
    const result = await db.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${idx} RETURNING id, tg_id, username, email, role, currency, created_at, deleted_at`,
      values
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/broadcast
// Barcha faol foydalanuvchilarga Telegram orqali ommaviy xabar.
export async function broadcast(req, res, next) {
  try {
    const { text, parseMode = "Markdown" } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      throw new ApiError(400, "Xabar matni (text) talab qilinadi");
    }
    if (!["Markdown", "HTML"].includes(parseMode)) {
      throw new ApiError(400, "parseMode 'Markdown' yoki 'HTML' bo'lishi kerak");
    }

    const result = await sendBroadcast({ text, parseMode });

    res.json({
      success: true,
      message: "Broadcast yakunlandi",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

// ============ Global kategoriyalar (admin) ============
// Global kategoriyalar `user_id = NULL` bo'lgan qatorlardir —
// barcha foydalanuvchilarga ko'rinadi (categoryController getCategories
// allaqachon `user_id IS NULL` ni inobatga oladi).

// GET /api/admin/categories?type=income|expense
export async function getGlobalCategories(req, res, next) {
  try {
    const { type } = req.query;
    const params = [];
    let sql = "SELECT * FROM categories WHERE user_id IS NULL";
    if (type && ["income", "expense"].includes(type)) {
      params.push(type);
      sql += ` AND type = $1`;
    }
    sql += " ORDER BY id ASC";

    const result = await db.query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/categories
export async function createGlobalCategory(req, res, next) {
  try {
    const { title, type } = req.body;
    if (!title || typeof title !== "string" || !title.trim()) {
      throw new ApiError(400, "title talab qilinadi");
    }
    if (!["income", "expense"].includes(type)) {
      throw new ApiError(400, "type 'income' yoki 'expense' bo'lishi kerak");
    }

    // Takrorlanuvchi nomni tekshiramiz (global darajada).
    const dup = await db.query(
      "SELECT id FROM categories WHERE user_id IS NULL AND LOWER(TRIM(title)) = LOWER($1)",
      [title.trim()]
    );
    if (dup.rows[0]) {
      throw new ApiError(409, "Bu nomdagi global kategoriya allaqachon mavjud");
    }

    const result = await db.query(
      "INSERT INTO categories (user_id, title, type) VALUES (NULL, $1, $2) RETURNING *",
      [title.trim(), type]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/categories/:id
export async function updateGlobalCategory(req, res, next) {
  try {
    const id = parseId(req.params.id, "id");
    const { title, type } = req.body;

    const existing = await db.query(
      "SELECT * FROM categories WHERE id = $1 AND user_id IS NULL",
      [id]
    );
    if (!existing.rows[0]) {
      throw new ApiError(404, "Global kategoriya topilmadi");
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        throw new ApiError(400, "title bo'sh bo'lishi mumkin emas");
      }
      fields.push(`title = $${idx++}`);
      values.push(title.trim());
    }
    if (type !== undefined) {
      if (!["income", "expense"].includes(type)) {
        throw new ApiError(400, "type 'income' yoki 'expense' bo'lishi kerak");
      }
      fields.push(`type = $${idx++}`);
      values.push(type);
    }
    if (!fields.length) {
      throw new ApiError(400, "Yangilash uchun title yoki type ko'rsating");
    }

    values.push(id);
    const result = await db.query(
      `UPDATE categories SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/categories/:id
export async function deleteGlobalCategory(req, res, next) {
  try {
    const id = parseId(req.params.id, "id");

    const existing = await db.query(
      "SELECT id FROM categories WHERE id = $1 AND user_id IS NULL",
      [id]
    );
    if (!existing.rows[0]) {
      throw new ApiError(404, "Global kategoriya topilmadi");
    }

    // Kategoriyaga bog'langan tranzaksiyalar category_id = NULL bo'ladi
    // (FK ON DELETE SET NULL), shu sababli ma'lumotlar yo'qolmaydi.
    await db.query("DELETE FROM categories WHERE id = $1", [id]);
    res.json({ success: true, message: "Global kategoriya o'chirildi" });
  } catch (err) {
    next(err);
  }
}
