import request from "supertest";
import { app } from "../src/app.js";
import { resetDb, createUser, closeDb } from "./helpers.mjs";

describe("Stats API (edge cases)", () => {
  beforeEach(resetDb);
  afterAll(closeDb);

  test("empty state: tranzaksiyasiz user summary -> 0, 0, 0", async () => {
    const { res } = await createUser(request(app));
    const summary = await request(app)
      .get("/api/stats/summary?month=8&year=2026")
      .set("Authorization", `Bearer ${res.body.accessToken}`);

    expect(summary.status).toBe(200);
    expect(summary.body.income).toBe(0);
    expect(summary.body.expense).toBe(0);
    expect(summary.body.balance).toBe(0);
  });

  test("empty state: category breakdown -> total_expense 0, empty array", async () => {
    const { res } = await createUser(request(app));
    const breakdown = await request(app)
      .get("/api/stats/categories?month=8&year=2026")
      .set("Authorization", `Bearer ${res.body.accessToken}`);

    expect(breakdown.status).toBe(200);
    expect(breakdown.body.total_expense).toBe(0);
    expect(breakdown.body.data).toEqual([]);
  });

  test("month=13 -> 400 (validatsiya)", async () => {
    const { res } = await createUser(request(app));
    const summary = await request(app)
      .get("/api/stats/summary?month=13&year=2026")
      .set("Authorization", `Bearer ${res.body.accessToken}`);
    expect(summary.status).toBe(400);
  });

  test("o'chirilgan (soft) tranzaksiya statistikaga tushmaydi", async () => {
    const { res } = await createUser(request(app));
    const token = res.body.accessToken;
    const header = { Authorization: `Bearer ${token}` };
    const ua = (method, url, body) => request(app)[method](url).set(header);

    const cat = await ua("post", "/api/categories").send({ title: "Kino", type: "expense" });
    const tx = await ua("post", "/api/transactions").send({
      category_id: cat.body.data.id,
      amount: 100000,
      type: "expense",
    });

    const before = await ua("get", "/api/stats/summary?month=8&year=2026");
    expect(before.body.expense).toBe(100000);

    await ua("delete", `/api/transactions/${tx.body.data.id}`);

    const after = await ua("get", "/api/stats/summary?month=8&year=2026");
    expect(after.body.expense).toBe(0);
  });

  test("kategoriya o'chirilganda ham chiqimlar statistikada Boshqa sifatida qoladi", async () => {
    const { res } = await createUser(request(app));
    const token = res.body.accessToken;
    const header = { Authorization: `Bearer ${token}` };
    const ua = (method, url, body) => request(app)[method](url).set(header);

    const cat = await ua("post", "/api/categories").send({ title: "Internet", type: "expense" });
    await ua("post", "/api/transactions").send({
      category_id: cat.body.data.id,
      amount: 70000,
      type: "expense",
    });

    await ua("delete", `/api/categories/${cat.body.data.id}`);

    const breakdown = await ua("get", "/api/stats/categories?month=8&year=2026");
    expect(breakdown.status).toBe(200);
    expect(breakdown.body.total_expense).toBe(70000);
    expect(breakdown.body.data[0].category).toBe("Boshqa");
    expect(breakdown.body.data[0].total).toBe(70000);
  });
});