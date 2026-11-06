import "server-only";

// Ingest endpoints are called from apps on any origin, so CORS is wide open.
// They only accept writes scoped by the project's ingest key.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-App-Key",
  "Access-Control-Max-Age": "86400",
};

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

export function preflight() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

const MAX_BODY_BYTES = 1_000_000;

/** Parses a JSON body, rejecting payloads over 1MB. Returns undefined for an empty body. */
export async function readJson(request: Request): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return { ok: false, response: json({ error: "payload too large (1MB max)" }, 413) };
  if (!text.trim()) return { ok: true, data: undefined };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, response: json({ error: "body is not valid JSON" }, 400) };
  }
}

export const unauthorized = () =>
  json({ error: "missing or invalid ingest key. Send it as 'Authorization: Bearer <key>', 'X-App-Key: <key>' or '?key=<key>'" }, 401);
