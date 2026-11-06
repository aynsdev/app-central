// Applies db/migrations/*.sql in order. Each file runs once, inside a transaction.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { DB_CONFIG_MISSING, connect, dbConfig } from "./db-config.mjs";

if (!dbConfig()) {
  console.error(DB_CONFIG_MISSING);
  process.exit(1);
}
const sql = connect(postgres, { max: 1, onnotice: () => {} });
const dir = path.join(import.meta.dirname, "..", "db", "migrations");

try {
  await sql`create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`;
  const applied = new Set((await sql`select name from schema_migrations`).map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const body = await readFile(path.join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    console.log(`applied ${file}`);
    count++;
  }
  console.log(count ? `${count} migration(s) applied` : "database is up to date");
} finally {
  await sql.end();
}
