import "server-only";
import { z } from "zod";
import { sql } from "@/lib/db";

export const MAX_BATCH = 500;
const MAX_PROPERTIES_BYTES = 16_384;

const id = z.string().trim().min(1).max(200);
const shortText = z.string().trim().max(100).optional().nullable();
const properties = z
  .record(z.string(), z.unknown())
  .optional()
  .refine((p) => !p || JSON.stringify(p).length <= MAX_PROPERTIES_BYTES, "properties too large (16KB max)");

/**
 * One event. Accepts a few common field-name spellings so existing apps and
 * third-party webhooks map onto it without glue code.
 */
export const eventSchema = z
  .object({
    event: z.string().trim().min(1).max(200).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    user_id: id.optional(),
    userId: id.optional(),
    anonymous_id: id.optional(),
    anonymousId: id.optional(),
    properties,
    timestamp: z.union([z.string(), z.number()]).optional(),
    session_id: z.string().max(200).optional().nullable(),
    app_version: shortText,
    platform: shortText,
    message_id: z.string().max(200).optional().nullable(),
  })
  .transform((e, ctx) => {
    const name = e.event ?? e.name;
    const userId = e.user_id ?? e.userId ?? e.anonymous_id ?? e.anonymousId;
    if (!name) ctx.addIssue({ code: "custom", message: "event is required" });
    if (!userId) ctx.addIssue({ code: "custom", message: "user_id (or anonymous_id) is required" });
    return {
      name: name!,
      userId: userId!,
      properties: e.properties ?? {},
      occurredAt: parseTimestamp(e.timestamp),
      sessionId: e.session_id ?? null,
      appVersion: e.app_version ?? null,
      platform: e.platform ?? null,
      messageId: e.message_id ?? null,
    };
  });

export type IngestEvent = z.output<typeof eventSchema>;

export const identifySchema = z.object({
  user_id: id,
  traits: properties,
  app_version: shortText,
  platform: shortText,
});

function parseTimestamp(input: string | number | undefined): Date {
  const now = Date.now();
  if (input === undefined) return new Date(now);
  // Numbers below 1e12 are unix seconds, otherwise milliseconds.
  const ms = typeof input === "number" ? (input < 1e12 ? input * 1000 : input) : Date.parse(input);
  if (!Number.isFinite(ms)) return new Date(now);
  // Offline apps send old timestamps (fine). A device clock in the future is not trusted.
  return new Date(Math.min(ms, now));
}

export type Project = { id: string; name: string; slug: string };

export async function projectFromKey(key: string | null): Promise<Project | null> {
  if (!key) return null;
  const [row] = await sql<Project[]>`select id, name, slug from projects where ingest_key = ${key}`;
  return row ?? null;
}

/** Reads the ingest key from `Authorization: Bearer`, `X-App-Key` or `?key=`. */
export function keyFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return request.headers.get("x-app-key") ?? new URL(request.url).searchParams.get("key");
}

/**
 * Stores events and keeps app_users rollups current. Duplicate message_ids
 * (an offline client retrying a batch) are dropped silently.
 */
export async function ingestEvents(projectId: string, events: IngestEvent[]) {
  if (events.length === 0) return { accepted: 0, duplicates: 0 };

  const rows = events.map((e) => ({
    project_id: projectId,
    user_id: e.userId,
    name: e.name,
    properties: e.properties,
    session_id: e.sessionId,
    app_version: e.appVersion,
    platform: e.platform,
    message_id: e.messageId,
    occurred_at: e.occurredAt,
  }));

  return sql.begin(async (tx) => {
    const inserted = await tx<{ userId: string; occurredAt: Date; appVersion: string | null; platform: string | null }[]>`
      insert into events ${tx(rows as never)}
      on conflict (project_id, message_id) where message_id is not null do nothing
      returning user_id, occurred_at, app_version, platform
    `;

    // Roll up per user: count, first/last seen, and version/platform from their latest event.
    const users = new Map<string, { first: Date; last: Date; count: number; appVersion: string | null; platform: string | null }>();
    for (const e of inserted) {
      const u = users.get(e.userId);
      if (!u) {
        users.set(e.userId, { first: e.occurredAt, last: e.occurredAt, count: 1, appVersion: e.appVersion, platform: e.platform });
        continue;
      }
      u.count++;
      if (e.occurredAt < u.first) u.first = e.occurredAt;
      if (e.occurredAt >= u.last) {
        u.last = e.occurredAt;
        u.appVersion = e.appVersion ?? u.appVersion;
        u.platform = e.platform ?? u.platform;
      }
    }

    if (users.size > 0) {
      const userRows = [...users].map(([id, u]) => ({
        project_id: projectId,
        id,
        event_count: u.count,
        first_seen_at: u.first,
        last_seen_at: u.last,
        app_version: u.appVersion,
        platform: u.platform,
      }));
      await tx`
        insert into app_users ${tx(userRows as never)}
        on conflict (project_id, id) do update set
          event_count = app_users.event_count + excluded.event_count,
          first_seen_at = least(app_users.first_seen_at, excluded.first_seen_at),
          app_version = case when excluded.last_seen_at >= app_users.last_seen_at
            then coalesce(excluded.app_version, app_users.app_version) else app_users.app_version end,
          platform = case when excluded.last_seen_at >= app_users.last_seen_at
            then coalesce(excluded.platform, app_users.platform) else app_users.platform end,
          last_seen_at = greatest(app_users.last_seen_at, excluded.last_seen_at)
      `;
    }

    return { accepted: inserted.length, duplicates: events.length - inserted.length };
  });
}

export async function identifyUser(projectId: string, input: z.output<typeof identifySchema>) {
  const traits = input.traits ?? {};
  await sql`
    insert into app_users (project_id, id, traits, app_version, platform, first_seen_at, last_seen_at)
    values (${projectId}, ${input.user_id}, ${sql.json(traits as never)}, ${input.app_version ?? null},
            ${input.platform ?? null}, now(), now())
    on conflict (project_id, id) do update set
      traits = app_users.traits || excluded.traits,
      app_version = coalesce(excluded.app_version, app_users.app_version),
      platform = coalesce(excluded.platform, app_users.platform),
      last_seen_at = greatest(app_users.last_seen_at, excluded.last_seen_at)
  `;
}
