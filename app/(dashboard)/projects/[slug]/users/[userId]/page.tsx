import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EventTable } from "@/components/event-table";
import { SectionTitle } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAppUser, listEvents } from "@/lib/analytics";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getProject } from "@/lib/projects";

export const metadata: Metadata = { title: "User" };

async function UserDetail({ params }: PageProps<"/projects/[slug]/users/[userId]">) {
  const { slug, userId: rawId } = await params;
  const project = await getProject(slug);
  const userId = decodeURIComponent(rawId);
  const [user, events] = await Promise.all([getAppUser(project.id, userId), listEvents(project.id, { userId, limit: 200 })]);
  if (!user) notFound();

  const facts: [string, string][] = [
    ["First seen", formatDateTime(user.firstSeenAt, project.timezone)],
    ["Last seen", formatDateTime(user.lastSeenAt, project.timezone)],
    ["Events", formatNumber(user.eventCount)],
    ["Platform", user.platform ?? "–"],
    ["App version", user.appVersion ?? "–"],
  ];
  const traits = Object.entries(user.traits);

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <Link href={`/projects/${slug}/users`} className="text-sm text-muted-foreground no-underline hover:text-foreground">
          ← All users
        </Link>
        <h2 className="font-mono text-lg font-semibold break-all">{user.id}</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <SectionTitle>Profile</SectionTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right tabular-nums">{v}</dd>
                </div>
              ))}
              {traits.length > 0 && <div className="mt-2 border-t border-border pt-3 text-xs font-medium text-subtle-foreground">Traits</div>}
              {traits.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="font-mono text-xs text-muted-foreground">{k}</dt>
                  <dd className="min-w-0 truncate text-right font-mono text-xs">{typeof v === "string" ? v : JSON.stringify(v)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card className="py-2">
          <CardHeader className="pt-4">
            <SectionTitle description="Most recent 200 events">Timeline</SectionTitle>
          </CardHeader>
          <CardContent className="px-2">
            <EventTable events={events} slug={slug} timezone={project.timezone} showUser={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function UserPage(props: PageProps<"/projects/[slug]/users/[userId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
      <UserDetail {...props} />
    </Suspense>
  );
}
