import { z } from "zod";
import { json, preflight, readJson, unauthorized } from "@/lib/api";
import { eventSchema, ingestEvents, keyFromRequest, MAX_BATCH, projectFromKey } from "@/lib/ingest";

const bodySchema = z.union([z.object({ events: z.array(z.unknown()).min(1).max(MAX_BATCH) }), z.array(z.unknown()).min(1).max(MAX_BATCH)]);

export const OPTIONS = preflight;

/**
 * POST /api/v1/events
 * Body: a single event, an array of events, or { events: [...] } (up to 500).
 */
export async function POST(request: Request) {
  const project = await projectFromKey(keyFromRequest(request));
  if (!project) return unauthorized();

  const body = await readJson(request);
  if (!body.ok) return body.response;

  const batch = bodySchema.safeParse(body.data);
  const raw = batch.success ? (Array.isArray(batch.data) ? batch.data : batch.data.events) : [body.data];

  const events = [];
  const errors: { index: number; error: string }[] = [];
  for (const [index, item] of raw.entries()) {
    const parsed = eventSchema.safeParse(item);
    if (parsed.success) events.push(parsed.data);
    else errors.push({ index, error: parsed.error.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ` : "") + i.message).join("; ") });
  }

  if (events.length === 0) return json({ error: "no valid events", errors }, 400);

  const result = await ingestEvents(project.id, events);
  return json({ ok: true, ...result, rejected: errors.length, errors: errors.length ? errors : undefined }, 202);
}
