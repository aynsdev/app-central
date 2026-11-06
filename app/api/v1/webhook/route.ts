import { json, preflight, readJson, unauthorized } from "@/lib/api";
import { eventSchema, ingestEvents, keyFromRequest, projectFromKey } from "@/lib/ingest";

export const OPTIONS = preflight;

const pick = (o: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) {
    const v = o[k];
    if ((typeof v === "string" && v.trim()) || typeof v === "number") return String(v);
  }
  return undefined;
};

/**
 * POST /api/v1/webhook?key=KEY[&event=NAME]
 * Accepts any JSON payload (from a backend, a form tool, a payment provider...)
 * and stores it as one event. The whole payload becomes the event's properties.
 */
export async function POST(request: Request) {
  const project = await projectFromKey(keyFromRequest(request));
  if (!project) return unauthorized();

  const body = await readJson(request);
  if (!body.ok) return body.response;
  const payload = body.data && typeof body.data === "object" && !Array.isArray(body.data) ? (body.data as Record<string, unknown>) : { data: body.data };

  const params = new URL(request.url).searchParams;
  const parsed = eventSchema.safeParse({
    event: params.get("event") ?? pick(payload, ["event", "type", "name", "action"]) ?? "webhook",
    user_id: params.get("user_id") ?? pick(payload, ["user_id", "userId", "app_user_id", "customer_id", "email"]) ?? "webhook",
    properties: payload,
    timestamp: pick(payload, ["timestamp", "created_at", "occurred_at"]),
  });
  if (!parsed.success) return json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, 400);

  await ingestEvents(project.id, [parsed.data]);
  return json({ ok: true }, 202);
}
