import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import db from "../src/config/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function init() {
  const sql = await readFile(join(__dirname, "tables.sql"), "utf-8");
  try {
    await db.query(sql);
    console.log("Ma'lumotlar bazasi muvaffaqiyatli yaratildi/tekshirildi");
  } catch (err) {
    console.error("Bazani yaratishda xatolik:", err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

init();
