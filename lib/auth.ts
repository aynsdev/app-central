import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";

export const SESSION_COOKIE = "ac_session";
const SESSION_DAYS = 30;

export type Admin = { id: string; email: string; name: string | null };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(adminId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await sql`insert into sessions (id, admin_id, expires_at) values (${hashToken(token)}, ${adminId}, ${expiresAt})`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await sql`delete from sessions where id = ${hashToken(token)}`;
  jar.delete(SESSION_COOKIE);
}

/** The signed-in admin, or null. Memoized per request. */
export const getAdmin = cache(async (): Promise<Admin | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await sql<Admin[]>`
    select a.id, a.email, a.name
    from sessions s join admins a on a.id = s.admin_id
    where s.id = ${hashToken(token)} and s.expires_at > now()
  `;
  return row ?? null;
});

/** Call at the top of every protected page section and server action. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/login");
  return admin;
}

export async function hasAnyAdmin(): Promise<boolean> {
  const [row] = await sql<{ exists: boolean }[]>`select exists (select 1 from admins) as exists`;
  return row.exists;
}
