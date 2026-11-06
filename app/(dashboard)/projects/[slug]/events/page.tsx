import { ActivityIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EventTable } from "@/components/event-table";
import { PageNav, parsePage } from "@/components/page-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { countEvents, getEventNames, listEvents } from "@/lib/analytics";
import { getProject } from "@/lib/projects";

export const metadata: Metadata = { title: "Events" };

const PAGE_SIZE = 50;

type Props = PageProps<"/projects/[slug]/events">;

async function EventStream({ params, searchParams }: Props) {
  const project = await getProject((await params).slug);
  const sp = await searchParams;
  const name = typeof sp.event === "string" && sp.event ? sp.event : undefined;
  const page = parsePage(sp.page);
  const [events, total, names] = await Promise.all([
    listEvents(project.id, { name, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countEvents(project.id, { name }),
    getEventNames(project.id),
  ]);

  return (
    <div className="grid gap-6">
      <form className="flex flex-wrap items-center gap-2">
        <NativeSelect name="event" defaultValue={name ?? ""} aria-label="Filter by event" className="w-64">
          <NativeSelectOption value="">All events</NativeSelectOption>
          {names.map((n) => (
            <NativeSelectOption key={n} value={n}>
              {n}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        <span className="text-sm text-muted-foreground">Newest first. Reload to see new events.</span>
      </form>
      {events.length === 0 ? (
        <Empty className="rounded-3xl bg-card py-16">
          <EmptyHeader>
            <EmptyMedia>
              <ActivityIcon />
            </EmptyMedia>
            <EmptyTitle>{page > 1 ? "No events on this page" : "No events yet"}</EmptyTitle>
            <EmptyDescription>{page > 1 ? "Go back to the first page." : "Events your apps send show up here within a second."}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Card className="py-2">
            <CardContent className="px-2">
              <EventTable events={events} slug={project.slug} timezone={project.timezone} />
            </CardContent>
          </Card>
          <PageNav page={page} pageSize={PAGE_SIZE} total={total} basePath={`/projects/${project.slug}/events`} query={{ event: name }} noun={["event", "events"]} />
        </>
      )}
    </div>
  );
}

export default function EventsPage(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
      <EventStream {...props} />
    </Suspense>
  );
}
