import "server-only";
import type postgres from "postgres";
import { sql } from "@/lib/db";

// All queries take a project id the caller already authorized via getProject().

export type Overview = {
  totalUsers: number;
  dau: number;
  wau: number;
  wauPrev: number;
  mau: number;
  newUsers7d: number;
  newUsersPrev7d: number;
  events7d: number;
  eventsPrev7d: number;
  lastEventAt: Date | null;
};

export async function getOverview(projectId: string): Promise<Overview> {
  const [row] = await sql<Overview[]>`
    with recent as (
      select user_id, occurred_at from events
      where project_id = ${projectId} and occurred_at > now() - interval '30 days'
    )
    select
      (select count(*)::int from app_users where project_id = ${projectId}) as total_users,
      (select count(distinct user_id)::int from recent where occurred_at > now() - interval '1 day') as dau,
      (select count(distinct user_id)::int from recent where occurred_at > now() - interval '7 days') as wau,
      (select count(distinct user_id)::int from recent where occurred_at <= now() - interval '7 days' and occurred_at > now() - interval '14 days') as wau_prev,
      (select count(distinct user_id)::int from recent) as mau,
      (select count(*)::int from app_users where project_id = ${projectId} and first_seen_at > now() - interval '7 days') as new_users_7d,
      (select count(*)::int from app_users where project_id = ${projectId}
         and first_seen_at <= now() - interval '7 days' and first_seen_at > now() - interval '14 days') as new_users_prev_7d,
      (select count(*)::int from recent where occurred_at > now() - interval '7 days') as events_7d,
      (select count(*)::int from recent where occurred_at <= now() - interval '7 days' and occurred_at > now() - interval '14 days') as events_prev_7d,
      (select max(occurred_at) from events where project_id = ${projectId}) as last_event_at
  `;
  return row;
}

export type DailyPoint = { date: string; active: number; newUsers: number; events: number };

/** One row per local day (project timezone), oldest first, zero-filled. */
export async function getDaily(projectId: string, timezone: string, days = 30): Promise<DailyPoint[]> {
  return sql<DailyPoint[]>`
    with bounds as (
      select date_trunc('day', now() at time zone ${timezone}) - ${days - 1} * interval '1 day' as start_local
    ),
    series as (
      select generate_series((select start_local from bounds), date_trunc('day', now() at time zone ${timezone}), interval '1 day') as day
    ),
    act as (
      select date_trunc('day', occurred_at at time zone ${timezone}) as day,
             count(distinct user_id)::int as active, count(*)::int as events
      from events
      where project_id = ${projectId} and occurred_at >= (select start_local from bounds) at time zone ${timezone}
      group by 1
    ),
    nu as (
      select date_trunc('day', first_seen_at at time zone ${timezone}) as day, count(*)::int as new_users
      from app_users
      where project_id = ${projectId} and first_seen_at >= (select start_local from bounds) at time zone ${timezone}
      group by 1
    )
    select to_char(s.day, 'YYYY-MM-DD') as date,
           coalesce(a.active, 0) as active, coalesce(n.new_users, 0) as new_users, coalesce(a.events, 0) as events
    from series s left join act a on a.day = s.day left join nu n on n.day = s.day
    order by s.day
  `;
}

export type Share = { label: string; users: number };

export async function getVersionShare(projectId: string): Promise<Share[]> {
  return sql<Share[]>`
    select coalesce(app_version, 'unknown') as label, count(*)::int as users
    from app_users
    where project_id = ${projectId} and last_seen_at > now() - interval '30 days'
    group by 1 order by users desc limit 8
  `;
}

export async function getPlatformShare(projectId: string): Promise<Share[]> {
  return sql<Share[]>`
    select coalesce(platform, 'unknown') as label, count(*)::int as users
    from app_users
    where project_id = ${projectId} and last_seen_at > now() - interval '30 days'
    group by 1 order by users desc limit 8
  `;
}

export type TopEvent = { name: string; count: number; users: number };

export async function getTopEvents(projectId: string, days = 30, limit = 10): Promise<TopEvent[]> {
  return sql<TopEvent[]>`
    select name, count(*)::int as count, count(distinct user_id)::int as users
    from events
    where project_id = ${projectId} and occurred_at > now() - ${days} * interval '1 day'
    group by name order by count desc limit ${limit}
  `;
}

export async function getEventNames(projectId: string): Promise<string[]> {
  const rows = await sql<{ name: string }[]>`
    select name from events
    where project_id = ${projectId} and occurred_at > now() - interval '90 days'
    group by name order by count(*) desc limit 200
  `;
  return rows.map((r) => r.name);
}

export type Cohort = { week: string; size: number; retained: number[] };

/** Weekly cohorts by first-seen week. retained[n] = users active in week n after joining (n=0 is the join week). */
export async function getRetention(projectId: string, timezone: string, weeks = 8): Promise<Cohort[]> {
  const rows = await sql<{ week: string; size: number; weekN: number; users: number }[]>`
    with start as (
      select date_trunc('week', now() at time zone ${timezone}) - ${weeks - 1} * interval '1 week' as w
    ),
    cohort as (
      select id, date_trunc('week', first_seen_at at time zone ${timezone}) as w
      from app_users
      where project_id = ${projectId} and first_seen_at >= (select w from start) at time zone ${timezone}
    ),
    activity as (
      select distinct user_id, date_trunc('week', occurred_at at time zone ${timezone}) as w
      from events
      where project_id = ${projectId} and occurred_at >= (select w from start) at time zone ${timezone}
    ),
    sizes as (select w, count(*)::int as size from cohort group by w)
    select to_char(c.w, 'YYYY-MM-DD') as week, s.size,
           (extract(day from a.w - c.w) / 7)::int as week_n, count(distinct c.id)::int as users
    from cohort c
    join sizes s on s.w = c.w
    join activity a on a.user_id = c.id and a.w >= c.w
    group by c.w, s.size, a.w
    order by c.w, week_n
  `;
  const byWeek = new Map<string, Cohort>();
  for (const r of rows) {
    const cohort = byWeek.get(r.week) ?? { week: r.week, size: r.size, retained: [] };
    cohort.retained[r.weekN] = r.users;
    byWeek.set(r.week, cohort);
  }
  for (const c of byWeek.values()) c.retained = Array.from(c.retained, (v) => v ?? 0);
  return [...byWeek.values()];
}

// ── Funnels ────────────────────────────────────────────────────────────────

export type FunnelStep = { event: string; key?: string; value?: string; label: string };

/**
 * A step is an event name, optionally narrowed by one property:
 *   "onboarding_completed"
 *   "onboarding_step step=goals"
 */
export function parseStep(input: string): FunnelStep | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const [event, ...rest] = trimmed.split(/\s+/);
  const filter = rest.join(" ");
  const eq = filter.indexOf("=");
  if (eq > 0) {
    return { event, key: filter.slice(0, eq).trim(), value: filter.slice(eq + 1).trim(), label: trimmed };
  }
  return { event, label: trimmed };
}

export type FunnelResult = {
  steps: { label: string; users: number }[];
  medianCompletionSeconds: number | null;
};

/**
 * Ordered funnel: a user counts for step N if they did step N after step N-1,
 * within `windowDays` of their first step. Only first steps in the last `rangeDays` count.
 */
export async function getFunnel(projectId: string, rawSteps: string[], windowDays: number, rangeDays = 30): Promise<FunnelResult | null> {
  const steps = rawSteps.map(parseStep).filter((s): s is FunnelStep => s !== null);
  if (steps.length === 0) return null;

  const filter = (s: FunnelStep, alias: string) =>
    s.key ? sql`and ${sql(alias)}.properties ->> ${s.key} = ${s.value ?? ""}` : sql``;

  let ctes: postgres.PendingQuery<postgres.Row[]> = sql`
    s0 as (
      select e.user_id, min(e.occurred_at) as t, min(e.occurred_at) as t0
      from events e
      where e.project_id = ${projectId} and e.name = ${steps[0].event}
        and e.occurred_at > now() - ${rangeDays} * interval '1 day' ${filter(steps[0], "e")}
      group by e.user_id
    )`;
  for (let i = 1; i < steps.length; i++) {
    ctes = sql`${ctes},
    ${sql(`s${i}`)} as (
      select e.user_id, min(e.occurred_at) as t, p.t0
      from events e join ${sql(`s${i - 1}`)} p on p.user_id = e.user_id
      where e.project_id = ${projectId} and e.name = ${steps[i].event}
        and e.occurred_at >= p.t and e.occurred_at <= p.t0 + ${windowDays} * interval '1 day' ${filter(steps[i], "e")}
      group by e.user_id, p.t0
    )`;
  }

  const counts = steps.map((_, i) => sql`(select count(*)::int from ${sql(`s${i}`)}) as ${sql(`c${i}`)}`);
  const selectList = counts.reduce((acc, c) => sql`${acc}, ${c}`);
  const last = sql(`s${steps.length - 1}`);

  const [row] = await sql<Record<string, number | null>[]>`
    with ${ctes}
    select ${selectList},
      (select percentile_cont(0.5) within group (order by extract(epoch from t - t0)) from ${last}) as median_seconds
  `;

  return {
    steps: steps.map((s, i) => ({ label: s.label, users: Number(row[`c${i}`] ?? 0) })),
    medianCompletionSeconds: row.medianSeconds == null ? null : Number(row.medianSeconds),
  };
}

// ── Property breakdowns (e.g. onboarding answers) ─────────────────────────

export type Breakdown = {
  event: string;
  key: string;
  distinct: number;
  /** Users who sent this property at least once. Percentages are relative to this. */
  answered: number;
  values: { value: string; users: number }[];
};

/**
 * For each property on the given events, how many users picked each value.
 * Array values (multi-select answers) are split into their elements.
 */
export async function getPropertyBreakdowns(projectId: string, eventNames: string[], rangeDays = 30, topN = 8): Promise<Breakdown[]> {
  if (eventNames.length === 0) return [];
  const rows = await sql<{ event: string; key: string; value: string; users: number }[]>`
    select e.name as event, kv.key, coalesce(arr.v, kv.value #>> '{}') as value, count(distinct e.user_id)::int as users
    from events e
    cross join lateral jsonb_each(e.properties) kv
    left join lateral jsonb_array_elements_text(case when jsonb_typeof(kv.value) = 'array' then kv.value end) arr(v) on true
    where e.project_id = ${projectId}
      and e.name = any(${eventNames})
      and e.occurred_at > now() - ${rangeDays} * interval '1 day'
      and jsonb_typeof(kv.value) in ('string', 'number', 'boolean', 'array')
    group by 1, 2, 3
  `;

  const answered = await sql<{ event: string; key: string; users: number }[]>`
    select e.name as event, kv.key, count(distinct e.user_id)::int as users
    from events e cross join lateral jsonb_each(e.properties) kv
    where e.project_id = ${projectId}
      and e.name = any(${eventNames})
      and e.occurred_at > now() - ${rangeDays} * interval '1 day'
    group by 1, 2
  `;
  const answeredBy = new Map(answered.map((a) => [`${a.event}\u0000${a.key}`, a.users]));

  const groups = new Map<string, Breakdown>();
  for (const r of rows) {
    if (r.value == null) continue;
    const id = `${r.event}\u0000${r.key}`;
    const g = groups.get(id) ?? { event: r.event, key: r.key, distinct: 0, answered: answeredBy.get(id) ?? 0, values: [] };
    g.distinct++;
    g.values.push({ value: r.value, users: r.users });
    groups.set(id, g);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, values: g.values.sort((a, b) => b.users - a.users).slice(0, topN) }))
    .sort((a, b) => a.event.localeCompare(b.event) || a.key.localeCompare(b.key));
}

// ── Users & events ─────────────────────────────────────────────────────────

export type AppUser = {
  id: string;
  traits: Record<string, unknown>;
  appVersion: string | null;
  platform: string | null;
  eventCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
};

export async function listAppUsers(projectId: string, opts: { q?: string; page?: number; pageSize?: number }) {
  const pageSize = opts.pageSize ?? 50;
  const page = Math.max(1, opts.page ?? 1);
  const q = opts.q?.trim();
  const where = q ? sql`and (id ilike ${"%" + q + "%"} or traits::text ilike ${"%" + q + "%"})` : sql``;
  const [users, [{ total }]] = await Promise.all([
    sql<AppUser[]>`
      select * from app_users where project_id = ${projectId} ${where}
      order by last_seen_at desc limit ${pageSize} offset ${(page - 1) * pageSize}
    `,
    sql<{ total: number }[]>`select count(*)::int as total from app_users where project_id = ${projectId} ${where}`,
  ]);
  return { users, total, page, pageSize };
}

export async function getAppUser(projectId: string, userId: string) {
  const [user] = await sql<AppUser[]>`select * from app_users where project_id = ${projectId} and id = ${userId}`;
  return user ?? null;
}

export type EventRow = {
  id: string;
  userId: string;
  name: string;
  properties: Record<string, unknown>;
  appVersion: string | null;
  platform: string | null;
  occurredAt: Date;
};

export async function listEvents(projectId: string, opts: { name?: string; userId?: string; limit?: number; offset?: number }) {
  return sql<EventRow[]>`
    select id::text, user_id, name, properties, app_version, platform, occurred_at
    from events
    where project_id = ${projectId}
      ${opts.name ? sql`and name = ${opts.name}` : sql``}
      ${opts.userId ? sql`and user_id = ${opts.userId}` : sql``}
    order by occurred_at desc, id desc
    limit ${opts.limit ?? 100} offset ${opts.offset ?? 0}
  `;
}

export async function countEvents(projectId: string, opts: { name?: string; userId?: string }) {
  const [{ total }] = await sql<{ total: number }[]>`
    select count(*)::int as total from events
    where project_id = ${projectId}
      ${opts.name ? sql`and name = ${opts.name}` : sql``}
      ${opts.userId ? sql`and user_id = ${opts.userId}` : sql``}
  `;
  return total;
}

/** Daily active users for the last `days` UTC days, for every project. Used for list sparklines. */
export async function getAllProjectSparklines(days = 14): Promise<Map<string, number[]>> {
  const rows = await sql<{ projectId: string; day: string; active: number }[]>`
    select project_id, to_char(date_trunc('day', occurred_at at time zone 'UTC'), 'YYYY-MM-DD') as day,
           count(distinct user_id)::int as active
    from events
    where occurred_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - ${days - 1} * interval '1 day'
    group by 1, 2
  `;
  const today = new Date();
  const keys = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (days - 1 - i)));
    return d.toISOString().slice(0, 10);
  });
  const byProject = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const m = byProject.get(r.projectId) ?? new Map<string, number>();
    m.set(r.day, r.active);
    byProject.set(r.projectId, m);
  }
  return new Map([...byProject].map(([id, m]) => [id, keys.map((k) => m.get(k) ?? 0)]));
}
