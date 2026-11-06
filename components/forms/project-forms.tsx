"use client";

import { useActionState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { createProjectAction, deleteProjectAction, generateReportAction, rotateKeyAction, saveOnboardingAction, updateProjectAction, type FormState } from "@/app/actions";
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

type ProjectDefaults = { name?: string; description?: string | null; platform?: string; timezone?: string; reportWebhookUrl?: string | null };

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
      <div className="grid gap-5 sm:grid-cols-2">
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

export function CreateProjectForm() {
  const [state, action, pending] = useActionState(createProjectAction, undefined);
  return (
    <form action={action}>
      <FieldGroup>
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
        <Field>
          <FieldLabel htmlFor="reportWebhookUrl">Report webhook</FieldLabel>
          <Input id="reportWebhookUrl" name="reportWebhookUrl" type="url" defaultValue={defaults.reportWebhookUrl ?? ""} placeholder="https://hooks.slack.com/services/…" />
          <FieldDescription>Weekly reports are posted here. Slack and Discord URLs get a formatted message; any other URL receives the report as JSON.</FieldDescription>
        </Field>
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
