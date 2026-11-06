import { json, preflight, readJson, unauthorized } from "@/lib/api";
import { eventSchema, ingestEvents, keyFromRequest, projectFromKey } from "@/lib/ingest";

export const OPTIONS = preflight;

/**
 * The smallest possible integration, for apps that only need "is this install alive?".
 * Records an `app_open` event.
 *
 *   GET  /api/v1/ping?key=KEY&user_id=DEVICE_ID&app_version=1.2.0&platform=ios
 *   POST /api/v1/ping  { "user_id": "...", "app_version": "...", "platform": "..." }
 */
async function ping(request: Request, input: Record<string, unknown>) {
  const project = await projectFromKey(keyFromRequest(request));
  if (!project) return unauthorized();

  const parsed = eventSchema.safeParse({ ...input, event: "app_open" });
  if (!parsed.success) return json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, 400);

  await ingestEvents(project.id, [parsed.data]);
  return json({ ok: true }, 202);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const input: Record<string, unknown> = {};
  for (const field of ["user_id", "anonymous_id", "app_version", "platform", "session_id"]) {
    const value = params.get(field);
    if (value) input[field] = value;
  }
  return ping(request, input);
}

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const data = body.data && typeof body.data === "object" ? (body.data as Record<string, unknown>) : {};
  return ping(request, data);
}
