import db from "../config/db.js";

const GEMINI_API_URL =
  process.env.GEMINI_API_URL ||
  "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

export async function getCachedAdvice(userId, month, year) {
  const result = await db.query(
    "SELECT * FROM ai_advices WHERE user_id = $1 AND month = $2 AND year = $3",
    [userId, month, year]
  );
  return result.rows[0] || null;
}

export async function cacheAdvice(userId, month, year, advice) {
  await db.query(
    `INSERT INTO ai_advices (user_id, month, year, advice)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, month, year) DO UPDATE SET advice = EXCLUDED.advice`,
    [userId, month, year, advice]
  );
}

async function fetchExpenseSummary(userId, month, year) {
  const result = await db.query(
    `SELECT COALESCE(c.title, 'Boshqa') AS category, COALESCE(SUM(t.amount), 0) AS total
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1 AND t.deleted_at IS NULL AND t.type = 'expense'
       AND EXTRACT(MONTH FROM t.created_at) = $2
       AND EXTRACT(YEAR FROM t.created_at) = $3
     GROUP BY COALESCE(c.title, 'Boshqa')
     ORDER BY total DESC`,
    [userId, month, year]
  );

  const total = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS expense
     FROM transactions
     WHERE user_id = $1 AND deleted_at IS NULL AND type = 'expense'
       AND EXTRACT(MONTH FROM created_at) = $2
       AND EXTRACT(YEAR FROM created_at) = $3`,
    [userId, month, year]
  );

  return {
    total_expense: parseFloat(total.rows[0].expense),
    categories: result.rows.map((r) => parseFloat(r.total)),
    category_titles: result.rows.map((r) => r.category),
  };
}

function generateSimpleAdvice(summary) {
  const lines = [
    `Sizning ${summary.total_expense} so'mlik xarajatlaringiz tahlil qilindi.`,
  ];

  if (summary.category_titles.length > 0) {
    lines.push(
      `Eng katta xarajat kategoriyasi: "${summary.category_titles[0]}" ` +
        `(${summary.categories[0]} so'm).`
    );
  }

  if (summary.total_expense > 0 && summary.categories.length > 0) {
    const top = summary.categories[0];
    const share = (top / summary.total_expense) * 100;
    lines.push(
      `Bu sizning umumiy xarajatingizning ~${Math.round(share)}% ini tashkil etadi.`
    );
  }

  lines.push(
    "Maslahat: Kelgusi oyda ushbu eng katta kategoriyadagi xarajatlarni 10-20% ga kamaytirishni tavsiya qilamiz."
  );

  return lines.join("\n");
}

export async function getAdvice(userId, month, year) {
  const summary = await fetchExpenseSummary(userId, month, year);

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  // Agar Gemini API kaliti sozlanmagan bo'lsa, lokal generatsiya qilamiz.
  if (!apiKey) {
    return generateSimpleAdvice(summary);
  }

  try {
    const url = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Foydalanuvchining oylik xarajat tahlili: ${JSON.stringify(
                  summary
                )}. Iqtisodiy maslahat bering (o'zbek tilida, qisqa).`,
              },
            ],
          },
        ],
      }),
      // Uzoq kechikishda so'rov bekor bo'lib, lokal fallback ishlatiladi
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API xatolik qaytardi: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const advice =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
      generateSimpleAdvice(summary);
    return advice;
  } catch (err) {
    console.error("Gemini API xatosi, fallback ishlatilmoqda:", err.message);
    return generateSimpleAdvice(summary);
  }
}
