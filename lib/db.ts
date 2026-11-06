import "server-only";
import postgres from "postgres";

const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return postgres(url, {
    max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    // Rows come back camelCased; write SQL in snake_case.
    transform: { column: { from: postgres.toCamel } },
    onnotice: () => {},
  });
}

// Reuse one pool across hot reloads in development.
export const sql = globalForDb.sql ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
