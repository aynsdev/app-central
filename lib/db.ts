import "server-only";
import postgres from "postgres";
import { connect } from "@/scripts/db-config.mjs";

const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

function createClient(): postgres.Sql {
  return connect(postgres, {
    max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    // Rows come back camelCased; write SQL in snake_case.
    transform: { column: { from: postgres.toCamel } },
    onnotice: () => {},
  });
}

// Reuse one pool across hot reloads in development.
export const sql = globalForDb.sql ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
