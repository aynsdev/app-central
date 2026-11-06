import "server-only";
import { sql } from "@/lib/db";
import { buildInsights, type Insight } from "@/lib/insights";
import type { ProjectRow } from "@/lib/projects";

export type ReportMetrics = {
  totalUsers: number;
  activeUsers: number;
  activeUsersPrev: number;
  newUsers: number;
  newUsersPrev: number;
  events: number;
  onboardingCompletion: number | null;
};

export type Report = {
  id: string;
  projectId: string;
  periodStart: Date;
  periodEnd: Date;
  metrics: ReportMetrics;
  insights: Insight[];
  deliveredAt: Date | null;
  deliveryError: string | null;
  createdAt: Date;
};

/** Builds a 7-day report, stores it, and sends it to the project's webhook when one is set. */
export async function generateReport(project: ProjectRow): Promise<Report> {
  const { overview: o, funnel, insights } = await buildInsights(project);
  const metrics: ReportMetrics = {
    totalUsers: o.totalUsers,
    activeUsers: o.wau,
    activeUsersPrev: o.wauPrev,
    newUsers: o.newUsers7d,
    newUsersPrev: o.newUsersPrev7d,
    events: o.events7d,
    onboardingCompletion: funnel && funnel.steps[0].users > 0 ? funnel.steps.at(-1)!.users / funnel.steps[0].users : null,
  };

  const [report] = await sql<Report[]>`
    insert into reports (project_id, period_start, period_end, metrics, insights)
    values (${project.id}, now() - interval '7 days', now(), ${sql.json(metrics as never)}, ${sql.json(insights as never)})
    returning *
  `;

  if (project.reportWebhookUrl) {
    const error = await deliver(project, report);
    const [updated] = await sql<Report[]>`
      update reports set delivered_at = ${error ? null : new Date()}, delivery_error = ${error}
      where id = ${report.id} returning *
    `;
    return updated;
  }
  return report;
}

function delta(now: number, before: number) {
  if (before === 0) return now > 0 ? "new" : "–";
  const d = Math.round(((now - before) / before) * 100);
  return `${d >= 0 ? "+" : ""}${d}%`;
}

export function reportToText(project: Pick<ProjectRow, "name" | "slug">, r: Pick<Report, "metrics" | "insights">) {
  const m = r.metrics;
  const icon = { critical: "🔴", warning: "🟠", info: "🔵", positive: "🟢" } as const;
  const lines = [
    `*${project.name}* weekly report`,
    `Active users: ${m.activeUsers} (${delta(m.activeUsers, m.activeUsersPrev)})`,
    `New users: ${m.newUsers} (${delta(m.newUsers, m.newUsersPrev)})`,
    `Total users: ${m.totalUsers} · Events: ${m.events}`,
  ];
  if (m.onboardingCompletion !== null) lines.push(`Onboarding completion: ${Math.round(m.onboardingCompletion * 100)}%`);
  if (r.insights.length) {
    lines.push("", "*Suggestions*");
    for (const i of r.insights.slice(0, 6)) lines.push(`${icon[i.severity]} ${i.title}`);
  }
  const appUrl = process.env.APP_URL;
  if (appUrl) lines.push("", `${appUrl.replace(/\/$/, "")}/projects/${project.slug}/reports`);
  return lines.join("\n");
}

/** Slack and Discord get a text message; any other URL gets the full JSON report. Returns an error string or null. */
async function deliver(project: ProjectRow, report: Report): Promise<string | null> {
  const url = project.reportWebhookUrl!;
  const text = reportToText(project, report);
  const body = url.includes("hooks.slack.com")
    ? { text }
    : url.includes("discord.com/api/webhooks") || url.includes("discordapp.com/api/webhooks")
      ? { content: text.replaceAll("*", "**") }
      : { type: "app_central.report", project: { name: project.name, slug: project.slug }, report, text };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok ? null : `Webhook responded ${res.status}`;
  } catch (e) {
    return e instanceof Error ? e.message : "Webhook request failed";
  }
}

export async function listReports(projectId: string, limit = 20) {
  return sql<Report[]>`select * from reports where project_id = ${projectId} order by created_at desc limit ${limit}`;
}
