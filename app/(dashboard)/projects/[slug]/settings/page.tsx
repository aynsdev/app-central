import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { CodeBlock, CopyButton } from "@/components/copy-button";
import { DeleteProjectButton, ProjectIconForm, ProjectSettingsForm, RotateKeyButton, WebhookForm } from "@/components/forms/project-forms";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { iconUrl } from "@/lib/icons";
import { getProject } from "@/lib/projects";

export const metadata: Metadata = { title: "Settings" };

type Props = PageProps<"/projects/[slug]/settings">;

async function baseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

function snippets(url: string, key: string) {
  return {
    sdk: `import { createAppCentral } from "./app-central"; // copy sdk/app-central.ts into your app

export const analytics = createAppCentral({
  endpoint: "${url}",
  key: "${key}",
  appVersion: "1.0.0",
  platform: "ios",
  // React Native: storage: AsyncStorage  (keeps the offline queue across launches)
});

// Anonymous device id is created and stored for you. Call identify once you know the user.
analytics.identify("user_123", { plan: "free" });

analytics.track("onboarding_started");
analytics.track("onboarding_step", { step: "goals", goal: ["sleep", "focus"] });
analytics.track("onboarding_completed");`,
    curl: `curl -X POST ${url}/api/v1/events \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "events": [
      { "event": "onboarding_started", "user_id": "device-abc" },
      { "event": "onboarding_step", "user_id": "device-abc", "properties": { "step": "goals", "goal": ["sleep"] } }
    ]
  }'`,
    ping: `# Simplest possible integration: one request per app launch.
# Works for offline-first apps: send it whenever there's a connection.
GET ${url}/api/v1/ping?key=${key}&user_id=DEVICE_ID&app_version=1.0.0&platform=android`,
    webhook: `# Point any service that sends JSON webhooks here.
# The event name is read from "event" / "type" / "name", or set it with ?event=
POST ${url}/api/v1/webhook?key=${key}&event=purchase_completed`,
  };
}

/** One settings row: what it is on the left, the controls on the right. Stacks on small screens. */
function Section({ id, title, description, children }: { id?: string; title: string; description: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-8 gap-4 border-t border-border pt-8 first:border-t-0 first:pt-0 lg:grid-cols-[240px_1fr] lg:gap-10">
      <div className="grid content-start gap-1">
        <h2 className="text-base font-semibold tracking-[-0.015em]">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid min-w-0 gap-4">{children}</div>
    </section>
  );
}

async function Settings({ params, searchParams }: Props) {
  const project = await getProject((await params).slug);
  const created = (await searchParams).created === "1";
  const url = await baseUrl();
  const code = snippets(url, project.ingestKey);

  return (
    <div className="grid gap-8">
      {created && (
        <Alert variant="success">
          <AlertTitle>{project.name} is ready</AlertTitle>
          <AlertDescription>
            <p>
              Add the ingest key to your app. Data appears on the Overview tab as soon as the first event arrives.{" "}
              <a href="#install" className="text-foreground underline decoration-border-strong underline-offset-[3px] hover:decoration-current">
                See how to send data
              </a>
            </p>
          </AlertDescription>
        </Alert>
      )}

      <Section title="General" description="How the project appears in the dashboard, and the time zone its charts use.">
        <Card>
          <CardContent className="grid gap-6">
            <ProjectIconForm slug={project.slug} name={project.name} src={iconUrl(project.slug, project.iconUpdatedAt)} />
            <ProjectSettingsForm
              slug={project.slug}
              defaults={{ name: project.name, description: project.description, platform: project.platform, timezone: project.timezone }}
            />
          </CardContent>
        </Card>
      </Section>

      <Section title="Ingest key" description="Identifies this project when your app sends data. It can only write events, so it is safe to ship inside an app.">
        <Card>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-2 rounded-xl bg-secondary py-1 pr-1 pl-4">
              <code className="min-w-0 flex-1 truncate font-mono text-sm">{project.ingestKey}</code>
              <CopyButton value={project.ingestKey} label="Copy key" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <RotateKeyButton slug={project.slug} />
              <p className="text-[13px] text-muted-foreground">Rotating stops the old key immediately.</p>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section id="install" title="Send data" description="Pick whichever fits the app. They can be mixed: the SDK in the app, the webhook from your backend.">
        <Card>
          <CardContent>
            <Tabs defaultValue="sdk">
              <TabsList>
                <TabsTrigger value="sdk">TypeScript SDK</TabsTrigger>
                <TabsTrigger value="curl">HTTP API</TabsTrigger>
                <TabsTrigger value="ping">Ping only</TabsTrigger>
                <TabsTrigger value="webhook">Webhook</TabsTrigger>
              </TabsList>
              <TabsContent value="sdk" className="mt-4">
                <CodeBlock code={code.sdk} />
              </TabsContent>
              <TabsContent value="curl" className="mt-4">
                <CodeBlock code={code.curl} />
              </TabsContent>
              <TabsContent value="ping" className="mt-4">
                <CodeBlock code={code.ping} />
              </TabsContent>
              <TabsContent value="webhook" className="mt-4">
                <CodeBlock code={code.webhook} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </Section>

      <Section title="Weekly reports" description="Where reports are posted when they are generated, by the Reports tab or the scheduled cron call.">
        <Card>
          <CardContent>
            <WebhookForm slug={project.slug} url={project.reportWebhookUrl} />
          </CardContent>
        </Card>
      </Section>

      <Section title="Danger zone" description="Deletes the project and every user, event and report in it. This can't be undone.">
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Apps still sending data to this key will get errors.</p>
            <DeleteProjectButton slug={project.slug} name={project.name} />
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}

export default function SettingsPage(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
      <Settings {...props} />
    </Suspense>
  );
}
