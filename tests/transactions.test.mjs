import request from "supertest";
import { app } from "../src/app.js";
import { resetDb, createUser, closeDb, api } from "./helpers.mjs";

describe("Transactions API", () => {
  let token;
  let catId;
  const add = (method, url, body) => api(token)(method, url, body);

  beforeEach(async () => {
    await resetDb();
    const { res } = await createUser(request(app));
    token = res.body.accessToken;
    const cat = await add("post", "/api/categories", { title: "Ovqat", type: "expense" });
    expect(cat.status).toBe(201);
    catId = cat.body.data.id;
  });

  afterAll(closeDb);

  test("create: 201 va to'g'ri ma'lumotlar", async () => {
    const res = await add("post", "/api/transactions", {
      category_id: catId,
      amount: 50000,
      type: "expense",
      comment: "tushlik",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe("50000.00");
    expect(res.body.data.type).toBe("expense");
    expect(res.body.data.deleted_at).toBeNull();
  });

  test.each([
    [{ amount: -100, type: "expense" }, "manfiy"],
    [{ amount: 0, type: "expense" }, "nol"],
    [{ amount: "50abc", type: "expense" }, "string-raqam"],
    [{ amount: true, type: "expense" }, "boolean"],
    [{ amount: "  ", type: "expense" }, "bo'sh"],
  ])("create: noto'g'ri amount (%s) -> 400", async (_label, body) => {
    const res = await add("post", "/api/transactions", body);
    expect(res.status).toBe(400);
  });

  test("create: noto'g'ri type -> 400", async () => {
    const res = await add("post", "/api/transactions", { amount: 100, type: "transfer" });
    expect(res.status).toBe(400);
  });

  test("create: boshqa userning kategoriyasi -> 400", async () => {
    const other = await createUser(request(app));
    const otherCat = await api(other.res.body.accessToken)("post", "/api/categories", {
      title: "Boshqa",
      type: "expense",
    });

    const res = await add("post", "/api/transactions", {
      category_id: otherCat.body.data.id,
      amount: 100,
      type: "expense",
    });
    expect(res.status).toBe(400);
  });

  test("list: paginatsiya va total", async () => {
    for (let i = 0; i < 3; i++) {
      await add("post", "/api/transactions", { category_id: catId, amount: 100 + i, type: "expense" });
    }

    const res = await add("get", "/api/transactions?page=1&limit=2");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(3);
  });

  test("list: manfiy page 500 emas, default limit ishlaydi", async () => {
    const res = await add("get", "/api/transactions?page=-5");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("list: boshqa userning tranzaksiyalari ko'rinmaydi", async () => {
    await add("post", "/api/transactions", { amount: 555, type: "expense" });

    const other = await createUser(request(app));
    const res = await api(other.res.body.accessToken)("get", "/api/transactions");
    expect(res.body.data).toHaveLength(0);
  });

  test("delete: soft-delete, ro'yxatdan chiqadi, qayta o'chirish 404", async () => {
    const created = await add("post", "/api/transactions", {
      category_id: catId,
      amount: 1000,
      type: "expense",
    });
    const id = created.body.data.id;

    const del = await add("delete", `/api/transactions/${id}`);
    expect(del.status).toBe(200);

    const list = await add("get", "/api/transactions");
    expect(list.body.data).toHaveLength(0);
    expect(list.body.total).toBe(0);

    const again = await add("delete", `/api/transactions/${id}`);
    expect(again.status).toBe(404);
  });

  test("delete: boshqa userning tranzaksiyasini o'chira olmaydi (404)", async () => {
    const created = await add("post", "/api/transactions", {
      category_id: catId,
      amount: 1000,
      type: "expense",
    });

    const other = await createUser(request(app));
    const res = await api(other.res.body.accessToken)("delete", `/api/transactions/${created.body.data.id}`);
    expect(res.status).toBe(404);
  });
});