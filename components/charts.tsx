import { formatDay, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

// Charts are plain HTML/SVG so they render on the server with zero client JS.
// One hue (chart-1) for magnitude; text stays in text tokens; hover/focus shows exact values.

/** Rounds the axis max up so the midpoint tick is a round number too (40/20/0, 200/100/0). */
function niceMax(n: number) {
  if (n <= 2) return 2;
  const half = n / 2;
  const pow = 10 ** Math.floor(Math.log10(half));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= half)! * pow;
  return Number.isInteger(step) ? step * 2 : Math.ceil(step) * 2;
}

/** Vertical bars, one per day. */
export function DailyBarChart({ data, label, unit = "users" }: { data: { date: string; value: number }[]; label: string; unit?: string }) {
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = [max, max / 2, 0];
  const labelEvery = Math.ceil(data.length / 6);

  return (
    <figure className="grid gap-2">
      <div className="grid grid-cols-[auto_1fr] gap-x-3">
        <div className="flex h-44 flex-col justify-between text-right text-[11px] tabular-nums text-subtle-foreground" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {formatNumber(t)}
            </span>
          ))}
        </div>
        <div className="relative h-44">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
            {ticks.map((t) => (
              <div key={t} className="border-t border-dashed border-border last:border-solid" />
            ))}
          </div>
          <ol className="relative flex h-full items-end gap-0.5" aria-label={label}>
            {data.map((d) => (
              <li
                key={d.date}
                tabIndex={0}
                className="group relative flex h-full flex-1 items-end outline-none"
                aria-label={`${formatDay(d.date)}: ${d.value} ${unit}`}
              >
                <div
                  className="w-full rounded-t-[4px] bg-chart-1 transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80"
                  style={{ height: `${max ? (d.value / max) * 100 : 0}%`, minHeight: d.value > 0 ? 2 : 0 }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap shadow-popover group-hover:block group-focus-visible:block">
                  <div className="text-muted-foreground">{formatDay(d.date)}</div>
                  <div className="font-semibold tabular-nums">
                    {formatNumber(d.value)} {unit}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div />
        <div className="flex gap-0.5 text-[11px] text-subtle-foreground" aria-hidden="true">
          {data.map((d, i) => (
            <span key={d.date} className="flex-1 overflow-visible whitespace-nowrap">
              {i % labelEvery === 0 ? formatDay(d.date) : ""}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

/** Tiny trend line for list rows and cards. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 100;
  const h = 28;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - (v / max) * (h - 4)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("h-7 w-full text-chart-1", className)} aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Horizontal bars with direct labels: share of a whole. */
export function ShareBars({ items, total, unit = "users" }: { items: { label: string; value: number }[]; total?: number; unit?: string }) {
  const sum = total ?? items.reduce((s, i) => s + i.value, 0);
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.label} className="grid gap-1.5" title={`${item.label}: ${item.value} ${unit}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{item.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatNumber(item.value)} <span className="text-subtle-foreground">· {sum ? formatPercent(item.value / sum) : "0%"}</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary">
            <div className="h-full rounded-full bg-chart-1" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Step-by-step conversion. Each bar is relative to the first step. */
export function FunnelBars({ steps }: { steps: { label: string; users: number }[] }) {
  const first = steps[0]?.users ?? 0;
  return (
    <ol className="grid gap-4">
      {steps.map((step, i) => {
        const prev = i === 0 ? step.users : steps[i - 1].users;
        const ofFirst = first ? step.users / first : 0;
        const drop = i > 0 && prev ? 1 - step.users / prev : 0;
        return (
          <li key={`${step.label}-${i}`} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="text-xs tabular-nums text-subtle-foreground">{i + 1}</span>
                <code className="truncate font-mono text-[13px]">{step.label}</code>
              </span>
              <span className="shrink-0 tabular-nums">
                {formatNumber(step.users)} <span className="text-muted-foreground">· {formatPercent(ofFirst)}</span>
              </span>
            </div>
            <div className="h-3 rounded-full bg-secondary">
              <div className="h-full rounded-full bg-chart-1" style={{ width: `${ofFirst * 100}%`, minWidth: step.users ? 4 : 0 }} />
            </div>
            {i > 0 && drop > 0 && (
              <p className={cn("text-xs tabular-nums", drop >= 0.4 ? "text-destructive" : "text-muted-foreground")}>
                {formatPercent(drop)} dropped since the previous step
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Weekly cohort retention heatmap. Darker = more of the cohort came back. */
export function RetentionGrid({ cohorts }: { cohorts: { week: string; size: number; retained: number[] }[] }) {
  const maxWeeks = Math.max(...cohorts.map((c) => c.retained.length), 1);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0.5 text-xs tabular-nums">
        <thead>
          <tr className="text-subtle-foreground">
            <th className="px-2 py-1 text-left font-medium">Cohort</th>
            <th className="px-2 py-1 text-right font-medium">Users</th>
            {Array.from({ length: maxWeeks }, (_, i) => (
              <th key={i} className="px-2 py-1 text-center font-medium">
                {i === 0 ? "Wk 0" : `+${i}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.week}>
              <th className="px-2 py-1.5 text-left font-medium whitespace-nowrap">{formatDay(c.week)}</th>
              <td className="px-2 py-1.5 text-right text-muted-foreground">{c.size}</td>
              {Array.from({ length: maxWeeks }, (_, i) => {
                const value = c.retained[i];
                if (value === undefined) return <td key={i} />;
                const rate = c.size ? value / c.size : 0;
                return (
                  <td key={i} className="relative rounded-md px-2 py-1.5 text-center" title={`${value} of ${c.size} users`}>
                    <span aria-hidden="true" className="absolute inset-0 rounded-md bg-chart-1" style={{ opacity: 0.08 + rate * 0.82 }} />
                    <span className={cn("relative", rate > 0.5 && "text-white")}>{formatPercent(rate)}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
