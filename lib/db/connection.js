import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const databasePath = path.resolve(process.env.DATABASE_PATH ?? ".data/chris-hub.sqlite");

function createConnection() {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const sqlite = new Database(databasePath);
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = FULL");
  sqlite.pragma("busy_timeout = 5000");
  return { sqlite, db: drizzle(sqlite) };
}

const globalForDb = globalThis;
const cached = globalForDb.__chrisHubDb ?? (globalForDb.__chrisHubDb = createConnection());

export const db = cached.db;
export const sqlite = cached.sqlite;
export default db;
