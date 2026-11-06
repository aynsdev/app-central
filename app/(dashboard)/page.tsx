import { FolderPlusIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Sparkline } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { ProjectIcon } from "@/components/project-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllProjectSparklines } from "@/lib/analytics";
import { formatNumber, formatRelative } from "@/lib/format";
import { iconUrl } from "@/lib/icons";
import { listProjects, type ProjectSummary } from "@/lib/projects";

export const metadata: Metadata = { title: "Projects" };

function Health({ project }: { project: ProjectSummary }) {
  const hours = project.hoursSinceEvent;
  if (hours === null) return <Badge variant="outline">No data yet</Badge>;
  if (hours < 24) return <Badge variant="success" dot>Live</Badge>;
  if (hours < 72) return <Badge variant="warning" dot>Quiet</Badge>;
  return <Badge variant="destructive" dot>Silent {Math.round(hours / 24)}d</Badge>;
}

async function ProjectGrid() {
  const [projects, sparklines] = await Promise.all([listProjects(), getAllProjectSparklines()]);

  if (projects.length === 0) {
    return (
      <Empty className="rounded-3xl bg-card py-16">
        <EmptyHeader>
          <EmptyMedia>
            <FolderPlusIcon />
          </EmptyMedia>
          <EmptyTitle>Add your first app</EmptyTitle>
          <EmptyDescription>Each project gets an ingest key. Drop it into your app and users, onboarding and activity show up here.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/projects/new">
              <PlusIcon /> New project
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((p) => (
        <Card key={p.id} asChild interactive>
          <Link href={`/projects/${p.slug}`} className="text-inherit no-underline">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ProjectIcon name={p.name} src={iconUrl(p.slug, p.iconUpdatedAt)} size="md" />
                  <div className="grid min-w-0 gap-1">
                    <CardTitle className="truncate">{p.name}</CardTitle>
                    <CardDescription className="capitalize">{p.platform.replace("-", " ")}</CardDescription>
                  </div>
                </div>
                <Health project={p} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <dl className="grid grid-cols-3 gap-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Users</dt>
                  <dd className="text-lg font-semibold tabular-nums">{formatNumber(p.totalUsers)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Active 7d</dt>
                  <dd className="text-lg font-semibold tabular-nums">{formatNumber(p.activeUsers7d)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Events 24h</dt>
                  <dd className="text-lg font-semibold tabular-nums">{formatNumber(p.events24h)}</dd>
                </div>
              </dl>
              <Sparkline values={sparklines.get(p.id) ?? Array(14).fill(0)} />
              <p className="text-xs text-muted-foreground">Last event {formatRelative(p.lastEventAt)}</p>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="grid gap-8">
      <PageHeader
        title="Projects"
        description="Every app you're tracking, at a glance."
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <PlusIcon /> New project
            </Link>
          </Button>
        }
      />
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-60 rounded-3xl" />
            ))}
          </div>
        }
      >
        <ProjectGrid />
      </Suspense>
    </div>
  );
}
