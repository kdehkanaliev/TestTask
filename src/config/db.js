import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("connect", () => {
  console.log("ulandi");
});

pool.on("error", (err) => {
  console.error( err);
  process.exit(-1);
});

export default {
  query: (text, params) => pool.query(text, params),
  close: () => pool.end(),
};
