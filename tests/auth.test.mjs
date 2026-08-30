import request from "supertest";
import db from "../src/config/db.js";
import { app } from "../src/app.js";
import { resetDb, createUser, closeDb } from "./helpers.mjs";

describe("Auth API", () => {
  beforeEach(resetDb);
  afterAll(closeDb);

  test("register: 201, tokenlar qaytadi, password qaytmaydi", async () => {
    const res = await request(app)
      .post("/api/users/auth/register")
      .send({ username: "alisher", email: "alisher@mail.uz", password: "secret123" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.role).toBe("user");
  });

  test("register: email takrorlansa 409", async () => {
    await request(app)
      .post("/api/users/auth/register")
      .send({ username: "a", email: "dup@mail.uz", password: "secret123" });

    const res = await request(app)
      .post("/api/users/auth/register")
      .send({ username: "b", email: "dup@mail.uz", password: "secret123" });

    expect(res.status).toBe(409);
  });

  test("register: ma'lumotlar etishmasa 400", async () => {
    const res = await request(app)
      .post("/api/users/auth/register")
      .send({ email: "x@mail.uz" });
    expect(res.status).toBe(400);
  });

  test("login: noto'g'ri parol 401, to'g'ri parol 200", async () => {
    await request(app)
      .post("/api/users/auth/register")
      .send({ username: "u", email: "u@mail.uz", password: "secret123" });

    const bad = await request(app)
      .post("/api/users/auth/login")
      .send({ email: "u@mail.uz", password: "wrongpass" });
    expect(bad.status).toBe(401);

    const ok = await request(app)
      .post("/api/users/auth/login")
      .send({ email: "u@mail.uz", password: "secret123" });
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toBeTruthy();
  });

  test("protected endpoint token'siz 401", async () => {
    const res = await request(app).get("/api/transactions");
    expect(res.status).toBe(401);
  });

  test("refresh: yangi tokenlar, eski refresh token bekor bo'ladi", async () => {
    const { res } = await createUser(request(app));
    const oldRt = res.body.refreshToken;

    const refresh = await request(app)
      .post("/api/users/auth/refresh")
      .send({ refreshToken: oldRt });
    expect(refresh.status).toBe(200);
    expect(refresh.body.accessToken).toBeTruthy();

    const reuse = await request(app)
      .post("/api/users/auth/refresh")
      .send({ refreshToken: oldRt });
    expect(reuse.status).toBe(401);
  });

  test("logout: refresh token o'chiriladi", async () => {
    const { res } = await createUser(request(app));
    const rt = res.body.refreshToken;

    const out = await request(app)
      .post("/api/users/auth/logout")
      .send({ refreshToken: rt });
    expect(out.status).toBe(200);

    const refresh = await request(app)
      .post("/api/users/auth/refresh")
      .send({ refreshToken: rt });
    expect(refresh.status).toBe(401);
  });

  test("GET /api/admin/users: oddiy user uchun 403", async () => {
    const { res } = await createUser(request(app));
    const custom = request(app).get("/api/admin/users").set("Authorization", `Bearer ${res.body.accessToken}`);
    const r = await custom;
    expect(r.status).toBe(403);
  });

  test("GET /api/admin/users: admin uchun 200 va ro'yxat", async () => {
    const { res } = await createUser(request(app));
    await db.query("UPDATE users SET role = 'admin' WHERE email = $1", [
      res.body.user.email,
    ]);

    const login = await request(app)
      .post("/api/users/auth/login")
      .send({ email: res.body.user.email, password: "secret123" });

    const list = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${login.body.accessToken}`);

    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.total).toBeGreaterThanOrEqual(1);
  });

  test("refresh token bazada hash'langan holda saqlanadi (security)", async () => {
    const { res } = await createUser(request(app));

    const stored = await db.query("SELECT token FROM refresh_tokens WHERE user_id = $1", [
      res.body.user.id,
    ]);
    expect(stored.rows[0].token).toBeTruthy();
    expect(stored.rows[0].token).not.toBe(res.body.refreshToken);
    expect(stored.rows[0].token).toMatch(/^[a-f0-9]{64}$/);
  });
});