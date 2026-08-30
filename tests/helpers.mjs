import request from "supertest";
import db from "../src/config/db.js";
import { app } from "../src/app.js";

export async function resetDb() {
  await db.query(
    "TRUNCATE users, categories, transactions, budgets, ai_advices, refresh_tokens RESTART IDENTITY CASCADE"
  );
}

export async function closeDb() {
  await db.close();
}

export async function createUser(agent, overrides = {}) {
  const stamp = Date.now() + Math.floor(Math.random() * 1000);
  const payload = {
    username: overrides.username || `user${stamp}`,
    email: overrides.email || `user${stamp}@test.uz`,
    password: overrides.password || "secret123",
  };
  const res = await agent.post("/api/users/auth/register").send(payload);
  return { res, payload };
}

// header'lar bilan to'g'ri Test obyekti qaytaruvchi yordamchi
export function api(token) {
  return (method, url, body) => {
    const req = request(app)[method](url);
    if (body !== undefined) req.send(body);
    return req.set("Authorization", `Bearer ${token}`);
  };
}