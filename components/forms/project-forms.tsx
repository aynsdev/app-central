"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ImagePlusIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  createProjectAction,
  deleteProjectAction,
  generateReportAction,
  removeIconAction,
  rotateKeyAction,
  saveOnboardingAction,
  updateProjectAction,
  updateWebhookAction,
  uploadIconAction,
  type FormState,
} from "@/app/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_ICON_BYTES = 512 * 1024;

const PLATFORM_LABELS: Record<string, string> = {
  ios: "iOS",
  android: "Android",
  "cross-platform": "iOS + Android",
  web: "Web",
  desktop: "Desktop",
  other: "Other",
};

function useToastOnSuccess(state: FormState) {
  useEffect(() => {
    if (state?.ok) toast.success(state.ok);
  }, [state]);
}

type ProjectDefaults = { name?: string; description?: string | null; platform?: string; timezone?: string };

function ProjectFields({ defaults, browserTimezone }: { defaults?: ProjectDefaults; browserTimezone?: boolean }) {
  return (
    <>
      <Field>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input id="name" name="name" defaultValue={defaults?.name} placeholder="Pillie" required maxLength={80} />
      </Field>
      <Field>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea id="description" name="description" defaultValue={defaults?.description ?? ""} rows={2} maxLength={500} placeholder="What the app does" />
      </Field>
      <div className="grid items-start gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="platform">Platform</FieldLabel>
          <NativeSelect id="platform" name="platform" defaultValue={defaults?.platform ?? "cross-platform"}>
            {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="timezone">Time zone</FieldLabel>
          <Input
            id="timezone"
            name="timezone"
            required
            defaultValue={defaults?.timezone ?? (browserTimezone ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC")}
            suppressHydrationWarning
          />
          <FieldDescription>Days and weeks in charts start in this zone.</FieldDescription>
        </Field>
      </div>
    </>
  );
}

/** The logo tile doubles as the upload button: click it to pick an image. */
function LogoButton({
  name,
  src,
  loading,
  onClick,
  label,
}: {
  name: string;
  src: string | null;
  loading?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      title={label}
      className="group relative grid size-16 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl bg-secondary text-xl font-semibold uppercase text-muted-foreground outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-wait"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob preview or small authenticated image
        <img src={src} alt="" className="size-full object-cover" />
      ) : name ? (
        name.slice(0, 1)
      ) : (
        <ImagePlusIcon className="size-6" aria-hidden="true" />
      )}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 grid place-items-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
          loading && "opacity-100",
        )}
      >
        {loading ? <Loader2Icon className="size-5 animate-spin" /> : <ImagePlusIcon className="size-5" />}
      </span>
    </button>
  );
}

/** Optional logo for the create form: previews locally, uploads with the form. */
function LogoPicker({ preview, onPick }: { preview: string | null; onPick: (file: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <Field>
      <FieldLabel htmlFor="icon">Logo</FieldLabel>
      <div className="flex flex-wrap items-center gap-4">
        <LogoButton name="" src={preview} onClick={() => inputRef.current?.click()} label={preview ? "Change logo" : "Choose logo"} />
        <div className="grid justify-items-start gap-1">
          {error ? <FieldError>{error}</FieldError> : <FieldDescription>Optional. Click to pick a square PNG, JPEG, WebP or GIF, up to 512 KB.</FieldDescription>}
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2.5"
              onClick={() => {
                if (inputRef.current) inputRef.current.value = "";
                onPick(null);
              }}
            >
              Remove
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          id="icon"
          type="file"
          name="icon"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0] ?? null;
            if (file && file.size > MAX_ICON_BYTES) {
              setError("The image is over 512 KB. Use a smaller or more compressed file.");
              e.currentTarget.value = "";
              onPick(null);
              return;
            }
            setError(null);
            onPick(file);
          }}
        />
      </div>
    </Field>
  );
}

export function CreateProjectForm() {
  const [state, action, pending] = useActionState(createProjectAction, undefined);
  const [preview, setPreview] = useState<string | null>(null);
  const pick = (file: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
  };
  return (
    // React resets the form after each submit, which clears the file input; drop the preview with it.
    <form action={action} onReset={() => pick(null)}>
      <FieldGroup>
        <LogoPicker preview={preview} onPick={pick} />
        <ProjectFields browserTimezone />
        <FieldError>{state?.error}</FieldError>
        <div>
          <Button type="submit" loading={pending}>
            Create project
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

export function ProjectSettingsForm({ slug, defaults }: { slug: string; defaults: ProjectDefaults }) {
  const [state, action, pending] = useActionState(updateProjectAction.bind(null, slug), undefined);
  useToastOnSuccess(state);
  return (
    <form action={action}>
      <FieldGroup>
        <ProjectFields defaults={defaults} />
        <FieldError>{state?.error}</FieldError>
        <div>
          <Button type="submit" loading={pending}>
            Save changes
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

export function WebhookForm({ slug, url }: { slug: string; url: string | null }) {
  const [state, action, pending] = useActionState(updateWebhookAction.bind(null, slug), undefined);
  useToastOnSuccess(state);
  return (
    <form action={action}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="reportWebhookUrl">Webhook URL</FieldLabel>
          <Input
            id="reportWebhookUrl"
            name="reportWebhookUrl"
            type="url"
            defaultValue={url ?? ""}
            placeholder="https://hooks.slack.com/services/…"
            aria-invalid={!!state?.error}
          />
          <FieldError>{state?.error}</FieldError>
          {!state?.error && <FieldDescription>Slack and Discord URLs get a formatted message. Any other URL receives the report as JSON. Leave empty to stop sending.</FieldDescription>}
        </Field>
        <div>
          <Button type="submit" loading={pending}>
            Save webhook
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

export function OnboardingForm({ slug, steps, windowDays, suggestions }: { slug: string; steps: string[]; windowDays: number; suggestions: string[] }) {
  const [state, action, pending] = useActionState(saveOnboardingAction.bind(null, slug), undefined);
  useToastOnSuccess(state);
  return (
    <form action={action}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="steps">Steps, one per line</FieldLabel>
          <Textarea
            id="steps"
            name="steps"
            rows={6}
            defaultValue={steps.join("\n")}
            className="font-mono text-[13px]"
            placeholder={"onboarding_started\nonboarding_step step=goals\nonboarding_step step=reminders\nonboarding_completed"}
          />
          <FieldDescription>
            Each line is an event name, optionally narrowed by one property: <code className="font-mono">event_name key=value</code>.
          </FieldDescription>
          {suggestions.length > 0 && (
            <FieldDescription>
              Events seen recently: <span className="font-mono">{suggestions.slice(0, 12).join(", ")}</span>
            </FieldDescription>
          )}
        </Field>
        <Field className="max-w-48">
          <FieldLabel htmlFor="windowDays">Completion window (days)</FieldLabel>
          <Input id="windowDays" name="windowDays" type="number" min={1} max={90} defaultValue={windowDays} />
        </Field>
        <FieldError>{state?.error}</FieldError>
        <div>
          <Button type="submit" loading={pending}>
            Save funnel
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

export function GenerateReportButton({ slug }: { slug: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      loading={pending}
      onClick={() =>
        start(async () => {
          const result = await generateReportAction(slug);
          if (result?.error) toast.error(result.error);
          else if (result?.ok) toast.success(result.ok);
        })
      }
    >
      Generate report now
    </Button>
  );
}

export function RotateKeyButton({ slug }: { slug: string }) {
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" loading={pending}>
          Rotate key
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rotate the ingest key?</AlertDialogTitle>
          <AlertDialogDescription>Apps using the current key stop sending data until you ship the new one.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              start(async () => {
                await rotateKeyAction(slug);
                toast.success("New key generated");
              })
            }
          >
            Rotate key
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteProjectButton({ slug, name }: { slug: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive-soft" loading={pending}>
          Delete project
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>This permanently deletes the project with all of its users, events and reports. This can&apos;t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => start(() => deleteProjectAction(slug))}>
            Delete project
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Picking a file uploads it straight away; the server re-checks size and format. */
export function ProjectIconForm({ slug, name, src }: { slug: string; name: string; src: string | null }) {
  const [state, action, pending] = useActionState(uploadIconAction.bind(null, slug), undefined);
  const [clientError, setClientError] = useState<string | null>(null);
  const [removing, startRemove] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useToastOnSuccess(state);

  const error = clientError ?? state?.error;

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-center gap-4">
      <LogoButton name={name} src={src} loading={pending} onClick={() => inputRef.current?.click()} label={src ? "Replace logo" : "Upload logo"} />
      <div className="grid justify-items-start gap-1">
        {error ? (
          <FieldError>{error}</FieldError>
        ) : (
          <FieldDescription>Click the logo to upload a square PNG, JPEG, WebP or GIF, up to 512 KB. 256×256 works well.</FieldDescription>
        )}
        {src && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2.5"
            loading={removing}
            onClick={() =>
              startRemove(async () => {
                await removeIconAction(slug);
                toast.success("Logo removed");
              })
            }
          >
            Remove
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          name="icon"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          tabIndex={-1}
          aria-label="Logo file"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (!file) return;
            if (file.size > MAX_ICON_BYTES) {
              setClientError("The image is over 512 KB. Use a smaller or more compressed file.");
              e.currentTarget.value = "";
              return;
            }
            setClientError(null);
            formRef.current?.requestSubmit();
          }}
        />
      </div>
    </form>
  );
}
