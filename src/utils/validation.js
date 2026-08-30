export function isValidPositiveNumber(value) {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "boolean") return false;
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}

export function clampInt(value, def, min = 1, max = 100) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(Math.max(n, min), max);
}