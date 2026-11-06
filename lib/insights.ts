import "server-only";
import { getFunnel, getOverview, getRetention, getVersionShare, type FunnelResult, type Overview } from "@/lib/analytics";
import type { ProjectRow } from "@/lib/projects";

export type Severity = "critical" | "warning" | "info" | "positive";

export type Insight = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  action?: { label: string; href: string };
};

const pct = (n: number) => `${Math.round(n * 100)}%`;
const change = (now: number, before: number) => (before === 0 ? null : (now - before) / before);

/** Compares dotted version strings numerically ("1.10.0" > "1.9.2"). Non-numeric parts sort last. */
export function compareVersions(a: string, b: string) {
  const pa = a.split(/[.+-]/).map((p) => Number.parseInt(p, 10));
  const pb = b.split(/[.+-]/).map((p) => Number.parseInt(p, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = Number.isNaN(pa[i]) ? -1 : (pa[i] ?? 0);
    const y = Number.isNaN(pb[i]) ? -1 : (pb[i] ?? 0);
    if (x !== y) return x - y;
  }
  return 0;
}

export type InsightContext = {
  overview: Overview;
  funnel: FunnelResult | null;
  insights: Insight[];
};

/**
 * Rule-based suggestions. Each rule only fires with enough data behind it,
 * so a quiet project gets setup guidance instead of noisy percentages.
 */
export async function buildInsights(project: ProjectRow): Promise<InsightContext> {
  const base = `/projects/${project.slug}`;
  const [overview, funnel, retention, versions] = await Promise.all([
    getOverview(project.id),
    project.onboardingSteps.length > 1 ? getFunnel(project.id, project.onboardingSteps, project.onboardingWindowDays) : null,
    getRetention(project.id, project.timezone, 6),
    getVersionShare(project.id),
  ]);
  const insights: Insight[] = [];
  const o = overview;

  // Setup and health
  if (!o.lastEventAt) {
    insights.push({
      id: "no-data",
      severity: "info",
      title: "Waiting for the first event",
      detail: "Add the ingest call to your app. Even an offline app can send a ping with a device id when it next has a connection.",
      action: { label: "Get your ingest key", href: `${base}/settings` },
    });
    return { overview, funnel, insights };
  }

  const silentHours = (Date.now() - new Date(o.lastEventAt).getTime()) / 3_600_000;
  if (silentHours > 48) {
    insights.push({
      id: "silent",
      severity: o.wauPrev > 10 ? "critical" : "warning",
      title: `No events in ${Math.round(silentHours / 24)} days`,
      detail: "Either nobody opened the app or tracking broke in a recent release. Check the latest build still calls the API.",
      action: { label: "Open the event stream", href: `${base}/events` },
    });
  }

  // Growth
  const wauChange = change(o.wau, o.wauPrev);
  if (wauChange !== null && o.wauPrev >= 10 && Math.abs(wauChange) >= 0.2) {
    insights.push(
      wauChange > 0
        ? { id: "wau-up", severity: "positive", title: `Weekly active users up ${pct(wauChange)}`, detail: `${o.wau} active users this week, against ${o.wauPrev} the week before.` }
        : {
            id: "wau-down",
            severity: "warning",
            title: `Weekly active users down ${pct(-wauChange)}`,
            detail: `${o.wau} active users this week, against ${o.wauPrev} the week before. Look for a release, an outage, or a slowdown in new installs.`,
          },
    );
  }

  const newChange = change(o.newUsers7d, o.newUsersPrev7d);
  if (newChange !== null && o.newUsersPrev7d >= 10 && newChange <= -0.3) {
    insights.push({
      id: "new-down",
      severity: "warning",
      title: `New users down ${pct(-newChange)} week over week`,
      detail: "Acquisition slowed. Check store ranking, a paused campaign, or a review that changed the listing.",
    });
  }

  if (o.mau >= 30) {
    const stickiness = o.dau / o.mau;
    if (stickiness < 0.1) {
      insights.push({
        id: "stickiness-low",
        severity: "info",
        title: `Stickiness is ${pct(stickiness)} (daily ÷ monthly active)`,
        detail: "Most people use the app occasionally. If it is meant to be daily, a reminder or a streak may help build the habit.",
      });
    } else if (stickiness >= 0.25) {
      insights.push({
        id: "stickiness-high",
        severity: "positive",
        title: `Strong habit: ${pct(stickiness)} of monthly users open it daily`,
        detail: "Above the usual 20% benchmark for consumer apps.",
      });
    }
  }

  // Onboarding
  if (project.onboardingSteps.length < 2) {
    insights.push({
      id: "no-funnel",
      severity: "info",
      title: "Define your onboarding funnel",
      detail: "List the events that make up onboarding to see where people drop off and what they answer.",
      action: { label: "Set up onboarding", href: `${base}/onboarding` },
    });
  } else if (funnel && funnel.steps[0].users >= 20) {
    const first = funnel.steps[0].users;
    const done = funnel.steps.at(-1)!.users;
    const completion = done / first;

    let worst = { index: 1, drop: 0 };
    for (let i = 1; i < funnel.steps.length; i++) {
      const prev = funnel.steps[i - 1].users;
      const drop = prev === 0 ? 0 : 1 - funnel.steps[i].users / prev;
      if (drop > worst.drop) worst = { index: i, drop };
    }
    if (worst.drop >= 0.25) {
      insights.push({
        id: "onboarding-drop",
        severity: worst.drop >= 0.5 ? "critical" : "warning",
        title: `${pct(worst.drop)} drop off before “${funnel.steps[worst.index].label}”`,
        detail: `The largest loss in onboarding is between “${funnel.steps[worst.index - 1].label}” and “${funnel.steps[worst.index].label}”. Consider making that step optional, shorter, or moving it after the first win.`,
        action: { label: "See the funnel", href: `${base}/onboarding` },
      });
    }
    insights.push(
      completion >= 0.6
        ? { id: "onboarding-good", severity: "positive", title: `${pct(completion)} finish onboarding`, detail: `${done} of ${first} users who started in the last 30 days completed every step.` }
        : {
            id: "onboarding-low",
            severity: completion < 0.3 ? "warning" : "info",
            title: `Only ${pct(completion)} finish onboarding`,
            detail: `${done} of ${first} users who started in the last 30 days completed every step. Fewer questions up front usually lifts this.`,
            action: { label: "See the funnel", href: `${base}/onboarding` },
          },
    );
  }

  // Retention: week-1 return rate across cohorts old enough to have a week 1.
  const mature = retention.filter((c) => c.retained.length > 1 || Date.now() - Date.parse(c.week) > 14 * 86_400_000);
  const cohortUsers = mature.reduce((s, c) => s + c.size, 0);
  if (cohortUsers >= 30) {
    const returned = mature.reduce((s, c) => s + (c.retained[1] ?? 0), 0);
    const w1 = returned / cohortUsers;
    if (w1 < 0.2) {
      insights.push({
        id: "retention-low",
        severity: "warning",
        title: `Only ${pct(w1)} come back in their second week`,
        detail: "Most new users don't return. Make sure the first session delivers the core value, and consider a reminder on day 2 or 3.",
        action: { label: "View retention", href: base },
      });
    } else if (w1 >= 0.4) {
      insights.push({ id: "retention-good", severity: "positive", title: `${pct(w1)} return in week two`, detail: "Healthy early retention across recent cohorts." });
    }
  }

  // Version adoption
  const totalKnown = versions.filter((v) => v.label !== "unknown").reduce((s, v) => s + v.users, 0);
  // Ignore versions only a handful of people run (test builds, a dev device).
  const known = versions.filter((v) => v.label !== "unknown" && v.users >= Math.max(3, totalKnown * 0.03));
  if (known.length > 1 && totalKnown >= 20) {
    const latest = [...known].sort((a, b) => compareVersions(b.label, a.label))[0];
    const share = latest.users / totalKnown;
    if (share < 0.5) {
      insights.push({
        id: "version-lag",
        severity: "info",
        title: `${pct(share)} of active users are on ${latest.label}`,
        detail: "Most people are on older versions. If the update includes fixes, consider an in-app update prompt.",
      });
    }
  }

  const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2, positive: 3 };
  insights.sort((a, b) => order[a.severity] - order[b.severity]);
  return { overview, funnel, insights };
}
