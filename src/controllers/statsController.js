import db from "../config/db.js";
import { ApiError } from "../middlewares/errorMiddleware.js";

function defaultMonth() {
  return {
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  };
}

function parseMonthYear(query) {
  const month = parseInt(query.month, 10);
  const year = parseInt(query.year, 10);
  const value = {
    month: Number.isNaN(month) ? defaultMonth().month : month,
    year: Number.isNaN(year) ? defaultMonth().year : year,
  };
  if (value.month < 1 || value.month > 12) {
    throw new ApiError(400, "month 1-12 oralig'ida bo'lishi kerak");
  }
  if (value.year < 1970) {
    throw new ApiError(400, "year noto'g'ri");
  }
  return value;
}

export async function getSummary(req, res, next) {
  try {
    const { month, year } = parseMonthYear(req.query);

    const result = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
       FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL
         AND EXTRACT(MONTH FROM created_at) = $2
         AND EXTRACT(YEAR FROM created_at) = $3`,
      [req.user.id, month, year]
    );

    const income = parseFloat(result.rows[0].income);
    const expense = parseFloat(result.rows[0].expense);

    res.json({
      success: true,
      month,
      year,
      income,
      expense,
      balance: income - expense,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCategoryBreakdown(req, res, next) {
  try {
    const { month, year } = parseMonthYear(req.query);

    const result = await db.query(
      `SELECT COALESCE(c.title, 'Boshqa') AS category,
              SUM(t.amount) AS total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.deleted_at IS NULL AND t.type = 'expense'
         AND EXTRACT(MONTH FROM t.created_at) = $2
         AND EXTRACT(YEAR FROM t.created_at) = $3
       GROUP BY COALESCE(c.title, 'Boshqa')
       ORDER BY total DESC`,
      [req.user.id, month, year]
    );

    const data = result.rows.map((r) => ({
      category: r.category,
      total: parseFloat(r.total),
      percent: 0,
    }));
    const totalExpense = data.reduce((s, r) => s + r.total, 0);
    data.forEach((r) => {
      r.percent = totalExpense > 0 ? (r.total / totalExpense) * 100 : 0;
    });

    res.json({ success: true, month, year, total_expense: totalExpense, data });
  } catch (err) {
    next(err);
  }
}

export async function getMonthlyTrend(req, res, next) {
  try {
    const groupBy = req.query.groupBy || "monthly"; // daily | weekly | monthly
    if (!["daily", "weekly", "monthly"].includes(groupBy)) {
      throw new ApiError(400, "groupBy (daily/weekly/monthly) bo'lishi kerak");
    }

    let select;
    let params = [req.user.id];

    if (groupBy === "daily") {
      select = `DATE(created_at) AS period`;
    } else if (groupBy === "weekly") {
      select = `DATE_TRUNC('week', created_at)::date AS period`;
    } else {
      select = `DATE_TRUNC('month', created_at)::date AS period`;
    }

    const sql = `
      SELECT ${select},
             COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
             COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
      FROM transactions
      WHERE user_id = $1 AND deleted_at IS NULL
      GROUP BY period
      ORDER BY period ASC`;

    const result = await db.query(sql, params);
    res.json({
      success: true,
      group_by: groupBy,
      data: result.rows.map((r) => ({
        period: r.period,
        income: parseFloat(r.income),
        expense: parseFloat(r.expense),
        balance: parseFloat(r.income) - parseFloat(r.expense),
      })),
    });
  } catch (err) {
    next(err);
  }
}
