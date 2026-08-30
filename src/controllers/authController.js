import bcrypt from "bcryptjs";
import { createHash, createHmac } from "node:crypto";
import db from "../config/db.js";
import { ApiError } from "../middlewares/errorMiddleware.js";
import { generateTokens, verifyToken } from "../middlewares/authMiddleware.js";

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hashToken = (token) => createHash("sha256").update(token).digest("hex");

function verifyTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return false;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  return calculated === hash;
}

function publicUser(user) {
  return {
    id: user.id,
    tg_id: user.tg_id,
    username: user.username,
    email: user.email,
    role: user.role,
    currency: user.currency,
    created_at: user.created_at,
  };
}

function parseUserId(value) {
  const id = parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, "user_id noto'g'ri");
  }
  return id;
}

async function persistRefreshToken(userId, refreshToken) {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES || "7d";
  const matches = expiresIn.match(/^(\d+)d$/);
  const days = matches ? parseInt(matches[1], 10) : 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await db.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
    [userId, hashToken(refreshToken), expiresAt]
  );
}

export async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      throw new ApiError(400, "username, email va password talab qilinadi");
    }

    const existing = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existing.rows[0]) {
      throw new ApiError(409, "Bu email allaqachon ro'yxatdan o'tgan");
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (username, email, password, role)
       VALUES ($1, $2, $3, 'user') RETURNING *`,
      [username, email, hashed]
    );

    const user = result.rows[0];
    const tokens = generateTokens(user);
    await persistRefreshToken(user.id, tokens.refreshToken);

    res.status(201).json({ success: true, user: publicUser(user), ...tokens });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new ApiError(400, "email va password talab qilinadi");
    }

    const result = await db.query(
      "SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL",
      [email]
    );
    const user = result.rows[0];
    if (!user) {
      throw new ApiError(401, "Email yoki parol noto'g'ri");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new ApiError(401, "Email yoki parol noto'g'ri");
    }

    const tokens = generateTokens(user);
    await persistRefreshToken(user.id, tokens.refreshToken);

    res.json({ success: true, user: publicUser(user), ...tokens });
  } catch (err) {
    next(err);
  }
}

export async function tgCheck(req, res, next) {
  try {
    // Bot har so'rovda `x-tg-id` headerini yuboradi; boshqa usullar ham qo'llab-quvvatlanadi.
    const tgId = Number(
      req.headers["x-tg-id"] ?? req.query.tg_id ?? req.body?.tg_id
    );
    if (!Number.isInteger(tgId) || tgId <= 0) {
      throw new ApiError(400, "tg_id (x-tg-id header yoki tg_id) talab qilinadi");
    }

    const result = await db.query(
      "SELECT * FROM users WHERE tg_id = $1 AND deleted_at IS NULL",
      [tgId]
    );
    const user = result.rows[0];

    res.json({
      success: true,
      registered: Boolean(user),
      user: user ? publicUser(user) : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function tgRegister(req, res, next) {
  try {
    const { tg_id, username, email, password, initData } = req.body;
    if (!tg_id || !Number.isInteger(Number(tg_id)) || Number(tg_id) <= 0) {
      throw new ApiError(400, "tg_id musbat butun son bo'lishi kerak");
    }
    if (email !== undefined && email !== null && !EMAIL_RE.test(email)) {
      throw new ApiError(400, "email noto'g'ri formatda");
    }
    if (password !== undefined && password !== null) {
      if (typeof password !== "string" || password.length < 6) {
        throw new ApiError(400, "password kamida 6 belgidan iborat bo'lishi kerak");
      }
    }

    // Telegram ulanishi tasdiqlangan bo'lsagina ishonamiz.
    // Bot serveri `initData`'ni bot token orqali o'zi generatsiya qiladi;
    // bot token sozlanmagan (muhit dev bo'lsa) — tekshiruv o'tkazib yuboriladi.
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && !verifyTelegramInitData(initData, botToken)) {
      throw new ApiError(401, "Telegram autentifikatsiyasi tasdiqlanmadi");
    }

    const numericTgId = Number(tg_id);
    const existing = await db.query("SELECT * FROM users WHERE tg_id = $1", [numericTgId]);

    let user;
    if (existing.rows[0]) {
      // Foydalanuvchi avvaldan bor — email/parol hali o'rnatilmagan bo'lsa
      // to'ldiramiz, aks holda mavjud ma'lumotlarni ustiga yozmaymiz.
      user = existing.rows[0];
      const updates = [];
      const values = [];
      let idx = 1;
      if (email && !user.email) {
        updates.push(`email = $${idx++}`);
        values.push(email.toLowerCase());
      }
      if (password && !user.password) {
        updates.push(`password = $${idx++}`);
        values.push(await bcrypt.hash(password, 10));
      }
      if (updates.length) {
        updates.push(`updated_at = $${idx++}`);
        values.push(new Date());
        const up = await db.query(
          `UPDATE users SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
          [...values, user.id]
        );
        user = up.rows[0];
      }
    } else {
      if (email) {
        const emailCheck = await db.query(
          "SELECT id FROM users WHERE email = $1",
          [email.toLowerCase()]
        );
        if (emailCheck.rows[0]) {
          throw new ApiError(409, "Bu email allaqachon ro'yxatdan o'tgan");
        }
      }
      const hashed = password ? await bcrypt.hash(password, 10) : null;
      const result = await db.query(
        `INSERT INTO users (tg_id, username, email, password, role)
         VALUES ($1, $2, $3, $4, 'user')
         ON CONFLICT (tg_id) DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [numericTgId, username || `tg_${numericTgId}`, email?.toLowerCase() || null, hashed]
      );
      user = result.rows[0];
    }

    const tokens = generateTokens(user);
    await persistRefreshToken(user.id, tokens.refreshToken);

    res.json({ success: true, user: publicUser(user), ...tokens });
  } catch (err) {
    next(err);
  }
}

export async function getAllUsers(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const result = await db.query(
      "SELECT id, tg_id, username, email, role, currency, created_at FROM users WHERE deleted_at IS NULL ORDER BY id DESC LIMIT $1 OFFSET $2",
      [parseInt(limit, 10), offset]
    );
    const count = await db.query(
      "SELECT COUNT(*)::int AS total FROM users WHERE deleted_at IS NULL"
    );

    res.json({
      success: true,
      data: result.rows,
      total: count.rows[0].total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const user_id = parseUserId(req.params.user_id);
    const { username, email, password, currency } = req.body;

    if (req.user.role !== "admin" && req.user.id !== user_id) {
      throw new ApiError(403, "Faqat o'z profilingizni tahrirlashingiz mumkin");
    }

    const current = await db.query(
      "SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL",
      [user_id]
    );
    if (!current.rows[0]) {
      throw new ApiError(404, "Foydalanuvchi topilmadi");
    }

    const fields = [];
    const values = [];
    let idx = 1;

    const addField = (name, value) => {
      if (value !== undefined) {
        fields.push(`${name} = $${idx++}`);
        values.push(value);
      }
    };

    addField("username", username);
    addField("email", email);
    addField("currency", currency);
    if (password) {
      if (typeof password !== "string" || password.length < 6) {
        throw new ApiError(400, "password kamida 6 belgidan iborat bo'lishi kerak");
      }
      fields.push(`password = $${idx++}`);
      values.push(await bcrypt.hash(password, 10));
    }
    fields.push(`updated_at = $${idx++}`);
    values.push(new Date());

    const result = await db.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      [...values, user_id]
    );

    res.json({ success: true, user: publicUser(result.rows[0]) });
  } catch (err) {
    next(err);
  }
}

export async function softDeleteUser(req, res, next) {
  try {
    const user_id = parseUserId(req.params.user_id);

    if (req.user.role !== "admin" && req.user.id !== user_id) {
      throw new ApiError(403, "Faqat o'z profilingizni o'chirishingiz mumkin");
    }

    const result = await db.query(
      "UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id",
      [user_id]
    );
    if (!result.rows[0]) {
      throw new ApiError(404, "Foydalanuvchi topilmadi");
    }

    res.json({ success: true, message: "Foydalanuvchi o'chirildi (soft delete)" });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new ApiError(400, "refreshToken talab qilinadi");
    }

    const stored = await db.query(
      "SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()",
      [hashToken(refreshToken)]
    );
    if (!stored.rows[0]) {
      throw new ApiError(401, "Yaroqsiz yoki muddati o'tgan refresh token");
    }

    const payload = verifyToken(refreshToken, JWT_REFRESH_SECRET);
    const userResult = await db.query(
      "SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL",
      [payload.id]
    );
    if (!userResult.rows[0]) {
      throw new ApiError(401, "Foydalanuvchi topilmadi");
    }

    await db.query("DELETE FROM refresh_tokens WHERE token = $1", [hashToken(refreshToken)]);

    const user = userResult.rows[0];
    const tokens = generateTokens(user);
    await persistRefreshToken(user.id, tokens.refreshToken);

    res.json({ success: true, ...tokens });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await db.query("DELETE FROM refresh_tokens WHERE token = $1", [
        hashToken(refreshToken),
      ]);
    }
    res.json({ success: true, message: "Chiqildi" });
  } catch (err) {
    next(err);
  }
}
