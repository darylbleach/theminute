import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

type Db = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as {
  minutePool: Pool | undefined;
  minuteDb: Db | undefined;
};

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({ connectionString: url, max: 5 });
}

function createDb() {
  const pool = globalForDb.minutePool ?? createPool();
  if (process.env.NODE_ENV !== "production") {
    globalForDb.minutePool = pool;
  }
  return drizzle({ client: pool, schema });
}

export function getDb() {
  if (!globalForDb.minuteDb) {
    globalForDb.minuteDb = createDb();
  }
  return globalForDb.minuteDb;
}

export type Database = Db;
export type DbTransaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
export * from "./schema";
