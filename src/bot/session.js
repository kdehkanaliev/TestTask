// Qadam-baqadam dialoglarni (registration, kirim/chiqim, byudjet, kategoriya)
// saqlash uchun in-memory sessiya do'koni.
//
// Polling bitta protsessedan ishlagani uchun Map yetarli. TTL muddati bo'yicha
// eskirgan sessiyalar avtomatik tozalanadi. Ishlab chiqarishda bir nechta bot
// instansi ishlasa buni Redis kabi umumiy do'konga ko'chirish mumkin.
const sessions = new Map();
const SESSION_TTL = 30 * 60 * 1000; // 30 daqiqa

export function getSession(tgId) {
  const session = sessions.get(tgId);
  if (!session) return null;

  // Muddatidan oshgan sessiya tozalanadi
  if (Date.now() - session.updatedAt > SESSION_TTL) {
    sessions.delete(tgId);
    return null;
  }

  return session;
}

export function setSession(tgId, data) {
  sessions.set(tgId, { ...data, updatedAt: Date.now() });
  return sessions.get(tgId);
}

export function clearSession(tgId) {
  sessions.delete(tgId);
}

export default { getSession, setSession, clearSession };