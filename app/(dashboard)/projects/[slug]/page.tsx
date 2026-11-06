import { Suspense } from "react";
import { DailyBarChart, RetentionGrid, ShareBars } from "@/components/charts";
import { InsightList } from "@/components/insight-list";
import { SectionTitle } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat, StatDelta, StatLabel, StatValue } from "@/components/ui/stat";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDaily, getPlatformShare, getRetention, getTopEvents, getVersionShare } from "@/lib/analytics";
import { formatChange, formatNumber } from "@/lib/format";
import { buildInsights } from "@/lib/insights";
import { getProject } from "@/lib/projects";

type Params = { params: Promise<{ slug: string }> };

function StatCard({ label, value, now, before, caption }: { label: string; value: number; now?: number; before?: number; caption?: string }) {
  const delta = now !== undefined && before !== undefined ? formatChange(now, before) : null;
  return (
    <Card density="compact">
      <CardContent>
        <Stat>
          <StatLabel>{label}</StatLabel>
          <StatValue>{formatNumber(value)}</StatValue>
          {delta ? (
            <StatDelta trend={delta.trend} sentiment={delta.trend === "up" ? "positive" : delta.trend === "down" ? "negative" : "neutral"}>
              {delta.label} vs previous 7 days
            </StatDelta>
          ) : (
            caption && <StatDelta sentiment="neutral">{caption}</StatDelta>
          )}
        </Stat>
      </CardContent>
    </Card>
  );
}

async function Headline({ params }: Params) {
  const project = await getProject((await params).slug);
  const { overview: o, insights } = await buildInsights(project);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total users" value={o.totalUsers} caption="All time" />
        <StatCard label="Active today" value={o.dau} caption="Last 24 hours" />
        <StatCard label="Active this week" value={o.wau} now={o.wau} before={o.wauPrev} />
        <StatCard label="New this week" value={o.newUsers7d} now={o.newUsers7d} before={o.newUsersPrev7d} />
        <StatCard label="Events this week" value={o.events7d} now={o.events7d} before={o.eventsPrev7d} />
      </div>
      <Card>
        <CardHeader>
          <SectionTitle description="Generated from your data. Refreshes on every visit.">Suggestions</SectionTitle>
        </CardHeader>
        <CardContent>
          <InsightList insights={insights} />
        </CardContent>
      </Card>
    </>
  );
}

async function Activity({ params }: Params) {
  const project = await getProject((await params).slug);
  const daily = await getDaily(project.id, project.timezone, 30);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <SectionTitle description="Unique users with at least one event, per day">Daily active users</SectionTitle>
        </CardHeader>
        <CardContent>
          <DailyBarChart label="Daily active users, last 30 days" data={daily.map((d) => ({ date: d.date, value: d.active }))} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <SectionTitle description="Users seen for the first time, per day">New users</SectionTitle>
        </CardHeader>
        <CardContent>
          <DailyBarChart label="New users, last 30 days" data={daily.map((d) => ({ date: d.date, value: d.newUsers }))} />
        </CardContent>
      </Card>
    </div>
  );
}

async function Breakdown({ params }: Params) {
  const project = await getProject((await params).slug);
  const [retention, versions, platforms, topEvents] = await Promise.all([
    getRetention(project.id, project.timezone, 8),
    getVersionShare(project.id),
    getPlatformShare(project.id),
    getTopEvents(project.id, 30, 8),
  ]);
  return (
    <>
      <Card>
        <CardHeader>
          <SectionTitle description="Share of each week's new users who were active again in later weeks">Retention</SectionTitle>
        </CardHeader>
        <CardContent>
          {retention.length ? <RetentionGrid cohorts={retention} /> : <p className="text-sm text-muted-foreground">No cohorts in the last 8 weeks yet.</p>}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <SectionTitle description="Active users, last 30 days">App versions</SectionTitle>
          </CardHeader>
          <CardContent>
            {versions.length ? <ShareBars items={versions.map((v) => ({ label: v.label, value: v.users }))} /> : <p className="text-sm text-muted-foreground">No data yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <SectionTitle description="Active users, last 30 days">Platforms</SectionTitle>
          </CardHeader>
          <CardContent>
            {platforms.length ? <ShareBars items={platforms.map((v) => ({ label: v.label, value: v.users }))} /> : <p className="text-sm text-muted-foreground">No data yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <SectionTitle description="Last 30 days">Top events</SectionTitle>
          </CardHeader>
          <CardContent>
            {topEvents.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead numeric>Count</TableHead>
                    <TableHead numeric>Users</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topEvents.map((e) => (
                    <TableRow key={e.name}>
                      <TableCell className="max-w-40 truncate font-mono text-[13px]">{e.name}</TableCell>
                      <TableCell numeric>{formatNumber(e.count)}</TableCell>
                      <TableCell numeric>{formatNumber(e.users)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function ProjectOverviewPage({ params }: PageProps<"/projects/[slug]">) {
  return (
    <div className="grid gap-4">
      <Suspense
        fallback={
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-48 rounded-3xl" />
          </>
        }
      >
        <Headline params={params} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-80 rounded-3xl" />}>
        <Activity params={params} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <Breakdown params={params} />
      </Suspense>
    </div>
  );
}
