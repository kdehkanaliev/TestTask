import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function globalSetup() {
  const { Pool } = pg;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sql = await readFile(join(__dirname, "..", "db", "tables.sql"), "utf-8");
  await pool.query(sql);
  await pool.end();
}