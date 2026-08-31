import request from "supertest";
import { createHmac } from "node:crypto";
import { app } from "../src/app.js";
import { resetDb, closeDb } from "./helpers.mjs";

// Bot so'rovlarini simulyatsiya qilish uchun yordamchi.
function botRequest(tgId) {
  return (method, url, body) => {
    const req = request(app)[method](url);
    if (body !== undefined) req.send(body);
    return req.set("x-tg-id", String(tgId));
  };
}

// Backend verifyTelegramInitData'dan o'tadigan yaroqli Telegram initData generatsiya qilish.
// Bot serverda ham xuddi shunday ishlaydi (src/bot/api.js buildInitData).
function telegramInitData(tgId, username) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const fields = new URLSearchParams();
  fields.set("auth_date", String(Math.floor(Date.now() / 1000)));
  fields.set("user", JSON.stringify({ id: tgId, username: username || `tg_${tgId}` }));

  const dataCheckString = [...fields.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  fields.set("hash", hash);
  return fields.toString();
}

// tg-register so'rovini bot qilgan kabi yuborish (initData bilan)
function tgRegisterBot({ tgId, username, email, password }) {
  return request(app)
    .post("/api/users/auth/tg-register")
    .send({
      tg_id: tgId,
      username,
      email,
      password,
      initData: telegramInitData(tgId, username),
    });
}

describe("Bot Auth API", () => {
  beforeEach(resetDb);
  afterAll(closeDb);

  test("tg-check: ro'yxatdan o'tmagan tg_id uchun registered=false", async () => {
    const res = await request(app)
      .get("/api/users/auth/tg-check")
      .set("x-tg-id", "123456789");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.registered).toBe(false);
    expect(res.body.user).toBeNull();
  });

  test("tg-register: email+parol bilan ro'yxatdan o'tkazadi", async () => {
    const res = await tgRegisterBot({
      tgId: 987654321,
      username: "bot_user",
      email: "bot@mail.uz",
      password: "secret123",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.tg_id).toBe("987654321");
    expect(res.body.user.email).toBe("bot@mail.uz");
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.accessToken).toBeTruthy();
  });

  test("tg-register: noto'g'ri email yoki qisqa parol -> 400", async () => {
    const badEmail = await tgRegisterBot({
      tgId: 111,
      username: "u",
      email: "not-an-email",
      password: "secret123",
    });
    expect(badEmail.status).toBe(400);

    const shortPass = await tgRegisterBot({
      tgId: 222,
      username: "u",
      email: "ok@mail.uz",
      password: "123",
    });
    expect(shortPass.status).toBe(400);
  });

  test("tg-register: takrorlangan email -> 409", async () => {
    await tgRegisterBot({
      tgId: 333,
      username: "u",
      email: "dup@mail.uz",
      password: "secret123",
    });

    const res = await tgRegisterBot({
      tgId: 444,
      username: "u2",
      email: "dup@mail.uz",
      password: "secret123",
    });
    expect(res.status).toBe(409);
  });

  test("tg-check: ro'yxatdan o'tgandan keyin registered=true va email qaytadi", async () => {
    await tgRegisterBot({
      tgId: 555001,
      username: "u",
      email: "u@mail.uz",
      password: "secret123",
    });

    const res = await request(app)
      .get("/api/users/auth/tg-check")
      .set("x-tg-id", "555001");

    expect(res.status).toBe(200);
    expect(res.body.registered).toBe(true);
    expect(res.body.user.email).toBe("u@mail.uz");
  });

  test("protected endpoint: x-tg-id header bilan bot so'rovi o'tadi (200)", async () => {
    await tgRegisterBot({
      tgId: 666001,
      username: "bot",
      email: "b@mail.uz",
      password: "secret123",
    });

    const res = await botRequest(666001)("get", "/api/transactions");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("protected endpoint: bot ham boshqa foydalanuvchining x-tg-id bilan kira olmaydi", async () => {
    await tgRegisterBot({
      tgId: 777001,
      username: "a",
      email: "a@mail.uz",
      password: "secret123",
    });

    // Ro'yxatdan o'tmagan tg_id uchun 401 qaytadi
    const res = await botRequest(999999)("get", "/api/transactions");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Foydalanuvchi ro'yxatdan o'tmagan");
  });

  test("protected endpoint: hech qanday kredensialsiz 401", async () => {
    const res = await request(app).get("/api/transactions");
    expect(res.status).toBe(401);
  });

  test("tg-email-check: bo'sh email uchun exists=false, band uchun true", async () => {
    const free = await request(app)
      .post("/api/users/auth/tg-email-check")
      .send({ email: "free@mail.uz" });
    expect(free.status).toBe(200);
    expect(free.body.exists).toBe(false);

    await tgRegisterBot({
      tgId: 101,
      username: "u",
      email: "booked@mail.uz",
      password: "secret123",
    });

    // case-insensitive tekshiriladi
    const used = await request(app)
      .post("/api/users/auth/tg-email-check")
      .send({ email: "BOOKED@mail.uz" });
    expect(used.status).toBe(200);
    expect(used.body.exists).toBe(true);
  });

  test("tg-login: to'g'ri parol bilan tg_id email hisobiga bog'lanadi", async () => {
    // Oddiy /register orqali email+parol bilan akkaunt yaratamiz
    const reg = await request(app)
      .post("/api/users/auth/register")
      .send({ username: "webuser", email: "web@mail.uz", password: "secret123" });
    expect(reg.status).toBe(201);

    const login = await request(app)
      .post("/api/users/auth/tg-login")
      .send({
        tg_id: 202,
        username: "bot_user",
        email: "web@mail.uz",
        password: "secret123",
        initData: telegramInitData(202, "bot_user"),
      });

    expect(login.status).toBe(200);
    expect(login.body.mode).toBe("login");
    expect(login.body.user.email).toBe("web@mail.uz");
    expect(login.body.user.tg_id).toBe("202");

    // Endi shu tg_id tg-check da ro'yxatdan o'tgan ko'rinadi
    const check = await request(app)
      .get("/api/users/auth/tg-check")
      .set("x-tg-id", "202");
    expect(check.body.registered).toBe(true);
    expect(check.body.user.email).toBe("web@mail.uz");
  });

  test("tg-login: noto'g'ri parol yoki mavjud bo'lmagan email -> 401", async () => {
    await request(app)
      .post("/api/users/auth/register")
      .send({ username: "u", email: "sec@mail.uz", password: "secret123" });

    const wrongPass = await request(app)
      .post("/api/users/auth/tg-login")
      .send({
        tg_id: 303,
        email: "sec@mail.uz",
        password: "wrongpass",
        initData: telegramInitData(303, "u"),
      });
    expect(wrongPass.status).toBe(401);

    const noEmail = await request(app)
      .post("/api/users/auth/tg-login")
      .send({
        tg_id: 304,
        email: "missing@mail.uz",
        password: "secret123",
        initData: telegramInitData(304, "u"),
      });
    expect(noEmail.status).toBe(401);
  });
});