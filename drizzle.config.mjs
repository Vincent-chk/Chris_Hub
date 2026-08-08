import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/schema/index.js",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? ".data/chris-hub.sqlite",
  },
});
