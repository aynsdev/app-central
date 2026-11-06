// Postgres connection settings from the environment.
// Accepts either DATABASE_URL, or Laravel/Forge-style DB_HOST, DB_PORT,
// DB_DATABASE, DB_USERNAME and DB_PASSWORD. DATABASE_URL wins if both are set.

/** @returns {{ url: string } | { host: string, port: number, database: string, username: string, password: string } | null} */
export function dbConfig(env = process.env) {
  if (env.DATABASE_URL) return { url: env.DATABASE_URL };
  if (!env.DB_DATABASE) return null;
  return {
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 5432),
    database: env.DB_DATABASE,
    username: env.DB_USERNAME || "postgres",
    password: env.DB_PASSWORD ?? "",
  };
}

export const DB_CONFIG_MISSING = "Database is not configured: set DATABASE_URL, or DB_HOST/DB_PORT/DB_DATABASE/DB_USERNAME/DB_PASSWORD";

/** Builds a postgres.js client from dbConfig() plus extra options. */
export function connect(postgres, options = {}) {
  const config = dbConfig();
  if (!config) throw new Error(DB_CONFIG_MISSING);
  return "url" in config ? postgres(config.url, options) : postgres({ ...config, ...options });
}
