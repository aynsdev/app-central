import { getAdmin } from "@/lib/auth";
import { getProjectIcon } from "@/lib/icons";

/** Serves a project's logo to signed-in admins. */
export async function GET(_request: Request, { params }: RouteContext<"/api/projects/[slug]/icon">) {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });

  const icon = await getProjectIcon((await params).slug);
  if (!icon) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(icon.data), {
    headers: {
      "Content-Type": icon.contentType,
      // URLs carry ?v=<updated_at>, so a new upload gets a new URL.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
