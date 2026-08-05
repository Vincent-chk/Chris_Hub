import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const databasePath = path.join(os.tmpdir(), `chris-hub-test-${process.pid}.sqlite`);
process.env.DATABASE_PATH = databasePath;

const { db, sqlite } = await import("../lib/db/connection.js");

migrate(db, { migrationsFolder: path.resolve("drizzle") });

export function cleanup() {
  sqlite.close();
  for (const suffix of ["", "-wal", "-shm"]) {
    fs.rmSync(`${databasePath}${suffix}`, { force: true });
  }
}

export { db, sqlite, databasePath };
