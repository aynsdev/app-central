"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, hasAnyAdmin, requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { deleteProjectIcon, MAX_ICON_BYTES, saveProjectIcon, sniffImageType } from "@/lib/icons";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getProject, newIngestKey, PLATFORMS, uniqueSlug } from "@/lib/projects";
import { generateReport } from "@/lib/reports";

export type FormState = { error?: string; ok?: string } | undefined;

const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Invalid input";

// ── Auth ───────────────────────────────────────────────────────────────────

const setupSchema = z.object({
  name: z.string().trim().max(100).optional(),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(10, "Use at least 10 characters for the password"),
});

export async function setupAction(_: FormState, formData: FormData): Promise<FormState> {
  if (await hasAnyAdmin()) return { error: "Setup is already complete. Sign in instead." };
  const parsed = setupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { name, email, password } = parsed.data;
  const [admin] = await sql<{ id: string }[]>`
    insert into admins (email, name, password_hash) values (${email}, ${name || null}, ${await hashPassword(password)})
    returning id
  `;
  await createSession(admin.id);
  redirect("/");
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const [admin] = await sql<{ id: string; passwordHash: string }[]>`select id, password_hash from admins where email = ${email}`;
  // Hash anyway when the account doesn't exist so timing doesn't reveal which emails are registered.
  const valid = admin ? await verifyPassword(password, admin.passwordHash) : (await hashPassword(password), false);
  if (!valid) return { error: "Email or password is incorrect." };
  await createSession(admin.id);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

// ── Projects ───────────────────────────────────────────────────────────────

const projectSchema = z.object({
  name: z.string().trim().min(1, "Give the project a name").max(80),
  description: z.string().trim().max(500).optional(),
  platform: z.enum(PLATFORMS),
  timezone: z
    .string()
    .trim()
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Unknown time zone (use an IANA name such as Asia/Manila)"),
});

export async function createProjectAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const icon = await readIcon(formData);
  if (icon && "error" in icon) return icon;

  const { name, description, platform, timezone } = parsed.data;
  const slug = await uniqueSlug(name);
  const [{ id }] = await sql<{ id: string }[]>`
    insert into projects (name, slug, description, platform, timezone, ingest_key)
    values (${name}, ${slug}, ${description || null}, ${platform}, ${timezone}, ${newIngestKey()})
    returning id
  `;
  if (icon) await saveProjectIcon(id, icon.bytes, icon.type);
  revalidatePath("/", "layout"); // sidebar lists projects
  redirect(`/projects/${slug}/settings?created=1`);
}

export async function updateProjectAction(slug: string, _: FormState, formData: FormData): Promise<FormState> {
  const project = await getProject(slug);
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { name, description, platform, timezone } = parsed.data;
  await sql`
    update projects set name = ${name}, description = ${description || null}, platform = ${platform}, timezone = ${timezone}
    where id = ${project.id}
  `;
  revalidatePath("/", "layout"); // the name shows in the sidebar
  return { ok: "Saved" };
}

const webhookSchema = z.object({
  reportWebhookUrl: z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Use a full http(s):// URL" })]),
});

export async function updateWebhookAction(slug: string, _: FormState, formData: FormData): Promise<FormState> {
  const project = await getProject(slug);
  const parsed = webhookSchema.safeParse({ reportWebhookUrl: String(formData.get("reportWebhookUrl") ?? "").trim() });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await sql`update projects set report_webhook_url = ${parsed.data.reportWebhookUrl || null} where id = ${project.id}`;
  refresh();
  return { ok: parsed.data.reportWebhookUrl ? "Webhook saved" : "Webhook removed" };
}

export async function rotateKeyAction(slug: string) {
  const project = await getProject(slug);
  await sql`update projects set ingest_key = ${newIngestKey()} where id = ${project.id}`;
  refresh();
}

export async function deleteProjectAction(slug: string) {
  const project = await getProject(slug);
  await sql`delete from projects where id = ${project.id}`;
  revalidatePath("/", "layout");
  redirect("/");
}

/** Reads and checks the "icon" file field. Returns null when no file was picked. */
async function readIcon(formData: FormData): Promise<{ bytes: Buffer; type: string } | { error: string } | null> {
  const file = formData.get("icon");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_ICON_BYTES) return { error: "The image is over 512 KB. Use a smaller or more compressed file." };
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return { error: "Use a PNG, JPEG, WebP or GIF image." };
  return { bytes, type };
}

export async function uploadIconAction(slug: string, _: FormState, formData: FormData): Promise<FormState> {
  const project = await getProject(slug);
  const icon = await readIcon(formData);
  if (!icon) return { error: "Choose an image to upload." };
  if ("error" in icon) return icon;

  await saveProjectIcon(project.id, icon.bytes, icon.type);
  revalidatePath("/", "layout"); // sidebar and cards show the icon
  return { ok: "Logo updated" };
}

export async function removeIconAction(slug: string) {
  const project = await getProject(slug);
  await deleteProjectIcon(project.id);
  revalidatePath("/", "layout");
}

// ── Onboarding & reports ───────────────────────────────────────────────────

export async function saveOnboardingAction(slug: string, _: FormState, formData: FormData): Promise<FormState> {
  const project = await getProject(slug);
  const steps = String(formData.get("steps") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const windowDays = Number(formData.get("windowDays") ?? 7);
  if (steps.length > 20) return { error: "A funnel can have at most 20 steps." };
  if (steps.some((s) => s.length > 200)) return { error: "Each step must be under 200 characters." };
  if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 90) return { error: "Window must be 1–90 days." };

  await sql`update projects set onboarding_steps = ${steps}, onboarding_window_days = ${windowDays} where id = ${project.id}`;
  refresh();
  return { ok: "Funnel saved" };
}

export async function generateReportAction(slug: string): Promise<FormState> {
  const project = await getProject(slug);
  const report = await generateReport(project);
  refresh();
  if (report.deliveryError) return { error: `Report saved, but delivery failed: ${report.deliveryError}` };
  return { ok: report.deliveredAt ? "Report generated and sent" : "Report generated" };
}
