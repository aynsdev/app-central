import "server-only";
import { sql } from "@/lib/db";

export const MAX_ICON_BYTES = 512 * 1024;

// Raster formats only. SVG is refused because it can carry scripts.
const SIGNATURES: { type: string; matches: (b: Buffer) => boolean }[] = [
  { type: "image/png", matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: "image/jpeg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/gif", matches: (b) => b.subarray(0, 6).toString("ascii") === "GIF87a" || b.subarray(0, 6).toString("ascii") === "GIF89a" },
  { type: "image/webp", matches: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

/** Detects the image type from the file's bytes, ignoring the client-supplied MIME type. */
export function sniffImageType(bytes: Buffer): string | null {
  return SIGNATURES.find((s) => s.matches(bytes))?.type ?? null;
}

export async function saveProjectIcon(projectId: string, bytes: Buffer, contentType: string) {
  await sql.begin(async (tx) => {
    await tx`
      insert into project_icons (project_id, data, content_type, updated_at)
      values (${projectId}, ${bytes}, ${contentType}, now())
      on conflict (project_id) do update set data = excluded.data, content_type = excluded.content_type, updated_at = excluded.updated_at
    `;
    await tx`update projects set icon_updated_at = now() where id = ${projectId}`;
  });
}

export async function deleteProjectIcon(projectId: string) {
  await sql.begin(async (tx) => {
    await tx`delete from project_icons where project_id = ${projectId}`;
    await tx`update projects set icon_updated_at = null where id = ${projectId}`;
  });
}

export async function getProjectIcon(slug: string) {
  const [row] = await sql<{ data: Buffer; contentType: string }[]>`
    select i.data, i.content_type from project_icons i join projects p on p.id = i.project_id where p.slug = ${slug}
  `;
  return row ?? null;
}

/** URL for <img src>. The version query changes on every upload, so the response can be cached forever. */
export function iconUrl(slug: string, updatedAt: Date | string | null) {
  return updatedAt ? `/api/projects/${encodeURIComponent(slug)}/icon?v=${new Date(updatedAt).getTime()}` : null;
}
