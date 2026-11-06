import "server-only";
import { randomBytes } from "node:crypto";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";

export const PLATFORMS = ["ios", "android", "cross-platform", "web", "desktop", "other"] as const;

export type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  platform: string;
  timezone: string;
  ingestKey: string;
  onboardingSteps: string[];
  onboardingWindowDays: number;
  reportWebhookUrl: string | null;
  createdAt: Date;
};

export const newIngestKey = () => `ac_${randomBytes(18).toString("base64url")}`;

export function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "-")
      .slice(0, 48) || "app"
  );
}

/** Project by slug for the signed-in admin; 404s when missing. */
export const getProject = cache(async (slug: string): Promise<ProjectRow> => {
  await requireAdmin();
  const [project] = await sql<ProjectRow[]>`select * from projects where slug = ${slug}`;
  if (!project) notFound();
  return project;
});

export type ProjectSummary = ProjectRow & {
  totalUsers: number;
  activeUsers7d: number;
  events24h: number;
  lastEventAt: Date | null;
  hoursSinceEvent: number | null;
};

export async function listProjects(): Promise<ProjectSummary[]> {
  await requireAdmin();
  return sql<ProjectSummary[]>`
    select p.*,
      (select count(*)::int from app_users u where u.project_id = p.id) as total_users,
      (select count(*)::int from app_users u where u.project_id = p.id and u.last_seen_at > now() - interval '7 days') as active_users_7d,
      (select count(*)::int from events e where e.project_id = p.id and e.occurred_at > now() - interval '24 hours') as events_24h,
      (select max(e.occurred_at) from events e where e.project_id = p.id) as last_event_at,
      (select extract(epoch from now() - max(e.occurred_at)) / 3600 from events e where e.project_id = p.id)::float as hours_since_event
    from projects p
    order by p.created_at
  `;
}

/** Lightweight list for navigation. */
export async function listProjectNames() {
  await requireAdmin();
  return sql<{ name: string; slug: string }[]>`select name, slug from projects order by created_at`;
}

export async function uniqueSlug(name: string) {
  const base = slugify(name);
  const taken = new Set(
    (await sql<{ slug: string }[]>`select slug from projects where slug = ${base} or slug like ${base + "-%"}`).map((r) => r.slug),
  );
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
