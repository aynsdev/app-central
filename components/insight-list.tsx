import { CircleAlertIcon, InfoIcon, TrendingUpIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Insight, Severity } from "@/lib/insights";

const style: Record<Severity, { variant: "destructive" | "warning" | "info" | "success"; icon: React.ReactNode; label: string }> = {
  critical: { variant: "destructive", icon: <CircleAlertIcon />, label: "Critical" },
  warning: { variant: "warning", icon: <TriangleAlertIcon />, label: "Warning" },
  info: { variant: "info", icon: <InfoIcon />, label: "Suggestion" },
  positive: { variant: "success", icon: <TrendingUpIcon />, label: "Good news" },
};

export function InsightList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing stands out right now. Suggestions appear as data comes in.</p>;
  }
  return (
    <ul className="grid gap-3">
      {insights.map((insight) => {
        const s = style[insight.severity];
        return (
          <li key={insight.id}>
            <Alert variant={s.variant}>
              {s.icon}
              <AlertTitle>
                <span className="sr-only">{s.label}: </span>
                {insight.title}
              </AlertTitle>
              <AlertDescription>
                <p>{insight.detail}</p>
                {insight.action && (
                  <Link href={insight.action.href} className="mt-1 inline-block text-foreground underline decoration-border-strong underline-offset-[3px] hover:decoration-current">
                    {insight.action.label} →
                  </Link>
                )}
              </AlertDescription>
            </Alert>
          </li>
        );
      })}
    </ul>
  );
}
