import type { Metadata } from "next";
import { Suspense } from "react";
import { FunnelBars, ShareBars } from "@/components/charts";
import { OnboardingForm } from "@/components/forms/project-forms";
import { SectionTitle } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat, StatLabel, StatValue } from "@/components/ui/stat";
import { getEventNames, getFunnel, getPropertyBreakdowns, parseStep } from "@/lib/analytics";
import { formatDuration, formatNumber, formatPercent } from "@/lib/format";
import { getProject } from "@/lib/projects";

export const metadata: Metadata = { title: "Onboarding" };

type Params = { params: Promise<{ slug: string }> };

async function Funnel({ params }: Params) {
  const project = await getProject((await params).slug);
  const funnel = await getFunnel(project.id, project.onboardingSteps, project.onboardingWindowDays, 30);

  if (!funnel || funnel.steps.length < 2) {
    return (
      <Card>
        <CardHeader>
          <SectionTitle>Onboarding funnel</SectionTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Add at least two steps below to see how many users get through onboarding and where they stop.
        </CardContent>
      </Card>
    );
  }

  const started = funnel.steps[0].users;
  const completed = funnel.steps.at(-1)!.users;
  return (
    <Card>
      <CardHeader>
        <SectionTitle description={`Users who started in the last 30 days and finished within ${project.onboardingWindowDays} days`}>Onboarding funnel</SectionTitle>
      </CardHeader>
      <CardContent className="grid gap-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat>
            <StatLabel>Started</StatLabel>
            <StatValue>{formatNumber(started)}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Completed</StatLabel>
            <StatValue>{formatNumber(completed)}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Completion rate</StatLabel>
            <StatValue>{started ? formatPercent(completed / started) : "–"}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Median time to complete</StatLabel>
            <StatValue>{funnel.medianCompletionSeconds != null ? formatDuration(funnel.medianCompletionSeconds) : "–"}</StatValue>
          </Stat>
        </div>
        <FunnelBars steps={funnel.steps} />
      </CardContent>
    </Card>
  );
}

async function Answers({ params }: Params) {
  const project = await getProject((await params).slug);
  const eventNames = [...new Set(project.onboardingSteps.map((s) => parseStep(s)?.event).filter((e): e is string => !!e))];
  const breakdowns = await getPropertyBreakdowns(project.id, eventNames, 30);

  return (
    <div className="grid gap-4">
      <SectionTitle description="Properties sent with your onboarding events. Percentages are of users who answered; multi-select answers (arrays) can add up to more than 100%.">
        Onboarding answers
      </SectionTitle>
      {breakdowns.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Send answers as event properties, for example{" "}
            <code className="font-mono text-foreground">{`track("onboarding_step", { step: "goals", goal: ["sleep", "focus"] })`}</code>, and they&apos;ll be
            summarized here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {breakdowns.map((b) => (
            <Card key={`${b.event}.${b.key}`} density="compact">
              <CardHeader>
                <div className="grid gap-0.5">
                  <h3 className="font-mono text-sm font-semibold">{b.key}</h3>
                  <p className="font-mono text-xs text-muted-foreground">
                    {b.event} · {formatNumber(b.answered)} answered · {b.distinct} {b.distinct === 1 ? "value" : "values"}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <ShareBars total={b.answered} items={b.values.map((v) => ({ label: v.value, value: v.users }))} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

async function Editor({ params }: Params) {
  const project = await getProject((await params).slug);
  const names = await getEventNames(project.id);
  return (
    <Card>
      <CardHeader>
        <SectionTitle description="The ordered events a new user goes through. Users must do each step after the previous one.">Funnel steps</SectionTitle>
      </CardHeader>
      <CardContent>
        <OnboardingForm slug={project.slug} steps={project.onboardingSteps} windowDays={project.onboardingWindowDays} suggestions={names} />
      </CardContent>
    </Card>
  );
}

export default function OnboardingPage({ params }: PageProps<"/projects/[slug]/onboarding">) {
  return (
    <div className="grid gap-8">
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <Funnel params={params} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-64 rounded-3xl" />}>
        <Answers params={params} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-80 rounded-3xl" />}>
        <Editor params={params} />
      </Suspense>
    </div>
  );
}
