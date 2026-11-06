import { json, preflight, readJson, unauthorized } from "@/lib/api";
import { identifySchema, identifyUser, keyFromRequest, projectFromKey } from "@/lib/ingest";

export const OPTIONS = preflight;

/**
 * POST /api/v1/identify
 * Body: { user_id, traits?, app_version?, platform? }. Traits are merged into the user's profile.
 */
export async function POST(request: Request) {
  const project = await projectFromKey(keyFromRequest(request));
  if (!project) return unauthorized();

  const body = await readJson(request);
  if (!body.ok) return body.response;

  const parsed = identifySchema.safeParse(body.data);
  if (!parsed.success) return json({ error: parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ") }, 400);

  await identifyUser(project.id, parsed.data);
  return json({ ok: true }, 202);
}
