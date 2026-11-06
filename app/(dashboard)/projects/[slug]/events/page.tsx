import { ActivityIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EventTable } from "@/components/event-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { getEventNames, listEvents } from "@/lib/analytics";
import { getProject } from "@/lib/projects";

export const metadata: Metadata = { title: "Events" };

type Props = PageProps<"/projects/[slug]/events">;

async function EventStream({ params, searchParams }: Props) {
  const project = await getProject((await params).slug);
  const sp = await searchParams;
  const name = typeof sp.event === "string" && sp.event ? sp.event : undefined;
  const [events, names] = await Promise.all([listEvents(project.id, { name, limit: 100 }), getEventNames(project.id)]);

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
        <span className="text-sm text-muted-foreground">Showing the latest 100. Reload to refresh.</span>
      </form>
      {events.length === 0 ? (
        <Empty className="rounded-3xl bg-card py-16">
          <EmptyHeader>
            <EmptyMedia>
              <ActivityIcon />
            </EmptyMedia>
            <EmptyTitle>No events yet</EmptyTitle>
            <EmptyDescription>Events your apps send show up here within a second.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="py-2">
          <CardContent className="px-2">
            <EventTable events={events} slug={project.slug} timezone={project.timezone} />
          </CardContent>
        </Card>
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
