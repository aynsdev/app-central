import { FileTextIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { GenerateReportButton } from "@/components/forms/project-forms";
import { InsightList } from "@/components/insight-list";
import { SectionTitle } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { formatChange, formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import { getProject } from "@/lib/projects";
import { listReports, type Report } from "@/lib/reports";

export const metadata: Metadata = { title: "Reports" };

function Metric({ label, value, before }: { label: string; value: number; before?: number }) {
  const delta = before !== undefined ? formatChange(value, before) : null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex items-baseline gap-2">
        <span className="text-lg font-semibold tabular-nums">{formatNumber(value)}</span>
        {delta && <span className={delta.trend === "down" ? "text-xs text-destructive" : delta.trend === "up" ? "text-xs text-success" : "text-xs text-muted-foreground"}>{delta.label}</span>}
      </dd>
    </div>
  );
}

function Delivery({ report, hasWebhook }: { report: Report; hasWebhook: boolean }) {
  if (report.deliveredAt) return <Badge variant="success">Sent</Badge>;
  if (report.deliveryError) return <Badge variant="destructive" title={report.deliveryError}>Delivery failed</Badge>;
  return hasWebhook ? <Badge>Not sent</Badge> : null;
}

async function ReportList({ params }: { params: Promise<{ slug: string }> }) {
  const project = await getProject((await params).slug);
  const reports = await listReports(project.id);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          description={
            project.reportWebhookUrl
              ? "Weekly summaries, also posted to your webhook."
              : "Weekly summaries. Add a webhook in Settings to receive them in Slack, Discord or your own endpoint."
          }
        >
          Reports
        </SectionTitle>
        <GenerateReportButton slug={project.slug} />
      </div>

      {reports.length === 0 ? (
        <Empty className="rounded-3xl bg-card py-16">
          <EmptyHeader>
            <EmptyMedia>
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>No reports yet</EmptyTitle>
            <EmptyDescription>Generate one now, or schedule POST /api/cron/reports weekly to get them automatically.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        reports.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">
                  {formatDateTime(r.periodStart, project.timezone)} – {formatDateTime(r.periodEnd, project.timezone)}
                </h3>
                <Delivery report={r} hasWebhook={!!project.reportWebhookUrl} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-6">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <Metric label="Active users" value={r.metrics.activeUsers} before={r.metrics.activeUsersPrev} />
                <Metric label="New users" value={r.metrics.newUsers} before={r.metrics.newUsersPrev} />
                <Metric label="Total users" value={r.metrics.totalUsers} />
                <Metric label="Events" value={r.metrics.events} />
                <div>
                  <dt className="text-xs text-muted-foreground">Onboarding completion</dt>
                  <dd className="text-lg font-semibold tabular-nums">{r.metrics.onboardingCompletion != null ? formatPercent(r.metrics.onboardingCompletion) : "–"}</dd>
                </div>
              </dl>
              <InsightList insights={r.insights} />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export default function ReportsPage({ params }: PageProps<"/projects/[slug]/reports">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
      <ReportList params={params} />
    </Suspense>
  );
}
