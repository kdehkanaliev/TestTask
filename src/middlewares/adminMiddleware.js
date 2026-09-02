// ============================================================
// adminMiddleware — Admin ruxsatini tekshirish
// ------------------------------------------------------------
// `authMiddleware` req.user'ni to'ldirgandan keyin ishlatiladi.
// Agar foydalanuvchi roli 'admin' bo'lmasa 403 Forbidden qaytaradi.
// ============================================================

export function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ success: false, message: "Ruxsat yo'q — faqat adminlar uchun" });
  }
  next();
}
