import { getCachedAdvice, cacheAdvice, getAdvice } from "../services/aiService.js";

export async function getAIAdvice(req, res, next) {
  try {
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    // Cached tekshiramiz -> har safar AI API'ga so'rov yubormaymiz
    const cached = await getCachedAdvice(req.user.id, month, year);
    if (cached) {
      return res.json({
        success: true,
        month,
        year,
        cached: true,
        advice: cached.advice,
      });
    }

    const advice = await getAdvice(req.user.id, month, year);
    await cacheAdvice(req.user.id, month, year, advice);

    res.json({
      success: true,
      month,
      year,
      cached: false,
      advice,
    });
  } catch (err) {
    next(err);
  }
}
