import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { CodeBlock, CopyButton } from "@/components/copy-button";
import { DeleteProjectButton, ProjectSettingsForm, RotateKeyButton } from "@/components/forms/project-forms";
import { SectionTitle } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

async function Settings({ params, searchParams }: Props) {
  const project = await getProject((await params).slug);
  const created = (await searchParams).created === "1";
  const url = await baseUrl();
  const code = snippets(url, project.ingestKey);

  return (
    <div className="grid gap-6">
      {created && (
        <Alert variant="success">
          <AlertTitle>{project.name} is ready</AlertTitle>
          <AlertDescription>Add the ingest key below to your app. Data appears on the Overview tab as soon as the first event arrives.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <SectionTitle description="Identifies this project when your app sends data. It can only write events, so it is safe to ship inside an app.">
            Ingest key
          </SectionTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-secondary py-1 pr-1 pl-4">
            <code className="min-w-0 flex-1 truncate font-mono text-sm">{project.ingestKey}</code>
            <CopyButton value={project.ingestKey} label="Copy key" />
          </div>
          <div>
            <RotateKeyButton slug={project.slug} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle description="Pick whichever fits the app. All of them can be mixed.">Send data</SectionTitle>
        </CardHeader>
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

      <Card>
        <CardHeader>
          <SectionTitle>Project</SectionTitle>
        </CardHeader>
        <CardContent>
          <ProjectSettingsForm
            slug={project.slug}
            defaults={{
              name: project.name,
              description: project.description,
              platform: project.platform,
              timezone: project.timezone,
              reportWebhookUrl: project.reportWebhookUrl,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle description="Deletes the project and every user, event and report in it.">Danger zone</SectionTitle>
        </CardHeader>
        <CardContent>
          <DeleteProjectButton slug={project.slug} name={project.name} />
        </CardContent>
      </Card>
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
