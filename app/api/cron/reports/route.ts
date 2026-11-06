import { timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";
import type { ProjectRow } from "@/lib/projects";
import { generateReport } from "@/lib/reports";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST /api/cron/reports  (Authorization: Bearer $CRON_SECRET)
 * Generates a weekly report for every project and delivers it to each project's webhook.
 * Schedule it weekly from cron, GitHub Actions, Vercel Cron, etc.
 */
export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

  const projects = await sql<ProjectRow[]>`select * from projects order by created_at`;
  const results = [];
  for (const project of projects) {
    try {
      const report = await generateReport(project);
      results.push({ project: project.slug, reportId: report.id, delivered: !!report.deliveredAt, error: report.deliveryError });
    } catch (e) {
      results.push({ project: project.slug, error: e instanceof Error ? e.message : "failed" });
    }
  }
  return Response.json({ ok: true, results });
}

// Vercel Cron issues GET requests.
export const GET = POST;
