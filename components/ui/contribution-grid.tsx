import * as React from "react"

import { cn } from "@/lib/utils"

type Contribution = { date: string; count: number }
type ContributionGridProps = React.ComponentProps<"figure"> & {
  /** Calendar year, from 1000 to 9999. Dates use YYYY-MM-DD, without a timezone. */
  year: number
  data: Contribution[]
  label?: string
  /** Last included date; later dates are shown as not yet available. */
  endDate?: string
  /** Inclusive upper bounds for levels 1–3; greater counts use level 4. */
  thresholds?: readonly [number, number, number]
  locale?: string
}

const DAY = 86_400_000
const levels = ["fill-secondary", "fill-foreground/25", "fill-foreground/45", "fill-foreground/70", "fill-foreground"]

/** Calendar arithmetic is UTC-based so DST and local time cannot shift a cell. */
function contributionDays(year: number, data: Contribution[]) {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new RangeError("ContributionGrid year must be an integer from 1000 to 9999.")
  }
  const counts = new Map<string, number>()
  for (const { date, count } of data) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isSafeInteger(count) || count < 0) continue
    counts.set(date, count) // Duplicate dates use the last value.
  }
  const start = Date.UTC(year, 0, 1)
  const end = Date.UTC(year + 1, 0, 1)
  return Array.from({ length: (end - start) / DAY }, (_, index) => {
    const date = new Date(start + index * DAY).toISOString().slice(0, 10)
    return { date, count: counts.get(date) ?? 0 }
  })
}

function ContributionGrid({ year, data, label = "Contributions", endDate, thresholds, locale = "en", className, ...props }: ContributionGridProps) {
  const id = React.useId()
  const days = contributionDays(year, data)
  if (endDate && (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || Number.isNaN(Date.parse(endDate)) || new Date(endDate).toISOString().slice(0, 10) !== endDate)) {
    throw new RangeError("ContributionGrid endDate must be a valid YYYY-MM-DD date.")
  }
  if (thresholds && (thresholds.length !== 3 || thresholds.some((value, index) => !Number.isSafeInteger(value) || value < 1 || (index > 0 && value <= thresholds[index - 1])))) {
    throw new RangeError("ContributionGrid thresholds must contain three increasing positive integers.")
  }
  const included = days.filter(day => !endDate || day.date <= endDate)
  const offset = new Date(Date.UTC(year, 0, 1)).getUTCDay()
  const weeks = Math.ceil((days.length + offset) / 7)
  const total = included.reduce((sum, day) => sum + day.count, 0)
  const maximum = Math.max(0, ...included.map((day) => day.count))
  const active = included.filter((day) => day.count > 0).length
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" })
  const level = (count: number) => count === 0 ? 0 : thresholds ? 1 + thresholds.filter(bound => count > bound).length : Math.ceil(count / maximum * 4)

  return (
    <figure data-slot="contribution-grid" className={cn("grid w-full min-w-0 gap-4 rounded-3xl bg-card p-6 text-card-foreground", className)} {...props}>
      <figcaption id={`${id}-caption`} className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-base font-semibold text-balance">{label}</span>
        <span className="text-sm tabular-nums text-muted-foreground">{year}</span>
      </figcaption>
      <p className="text-sm tabular-nums text-pretty">
        {total.toLocaleString(locale)} contribution{total === 1 ? "" : "s"}
        <span className="text-muted-foreground"> across {active} active day{active === 1 ? "" : "s"}</span>
      </p>
      <div role="region" aria-label={`${label} calendar, scroll horizontally to see the full year`} tabIndex={0} className="overflow-x-auto rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <svg role="img" aria-labelledby={`${id}-title ${id}-description`} width={48 + weeks * 16} height={140} viewBox={`0 0 ${48 + weeks * 16} 140`} className="block max-w-none font-sans text-xs">
          <title id={`${id}-title`}>{`${label} in ${year}`}</title>
          <desc id={`${id}-description`}>{total} contributions across {active} active days. {thresholds ? `Intensity thresholds: ${thresholds.join(", ")}; higher counts use the strongest level.` : `Intensity is relative to the busiest day (${maximum}).`} {endDate && `Dates after ${endDate} are not yet available.`} Exact daily counts are available in View daily counts below.</desc>
          {Array.from({ length: 12 }, (_, month) => {
            const index = (Date.UTC(year, month, 1) - Date.UTC(year, 0, 1)) / DAY
            const column = Math.floor((index + offset) / 7)
            return <text key={month} x={48 + column * 16} y={12} className="fill-muted-foreground">{new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month, 1)))}</text>
          })}
          {[1, 3, 5].map(index => <text key={index} x={0} y={34 + index * 16} className="fill-muted-foreground">{new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2023, 0, index + 1)))}</text>)}
          {days.map((day, index) => (
            <rect key={day.date} data-date={day.date} data-level={endDate && day.date > endDate ? "future" : level(day.count)} x={48 + Math.floor((index + offset) / 7) * 16} y={24 + ((index + offset) % 7) * 16} width={12} height={12} rx={3} className={cn(endDate && day.date > endDate ? "fill-none stroke-border-strong [stroke-dasharray:2_2]" : levels[level(day.count)], "hover:stroke-foreground")}>
              <title>{`${dateFormat.format(new Date(`${day.date}T00:00:00Z`))}: ${endDate && day.date > endDate ? "Not yet available" : `${day.count.toLocaleString(locale)} contribution${day.count === 1 ? "" : "s"}`}`}</title>
            </rect>
          ))}
        </svg>
      </div>
      <div aria-hidden="true" className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
        {endDate && <span className="mr-auto">Dashed cells: not yet available</span>}
        <span>Less</span>
        <svg width={76} height={12} className="shrink-0">{levels.map((fill, index) => <rect key={fill} x={index * 16} width={12} height={12} rx={3} className={fill} />)}</svg>
        <span>More</span>
      </div>
      <details data-slot="contribution-grid-details" className="text-sm">
        <summary className="w-fit cursor-pointer rounded-sm py-2 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">View daily counts</summary>
        <div role="region" aria-label="Daily contribution counts" tabIndex={0} className="mt-2 max-h-64 overflow-auto rounded-xl bg-secondary p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <table className="w-full text-left text-xs tabular-nums">
            <caption className="sr-only">{label} by date in {year}</caption>
            <thead><tr><th scope="col" className="pb-2 font-semibold">Date</th><th scope="col" className="pb-2 text-right font-semibold">Contributions</th></tr></thead>
            <tbody>{included.map((day) => <tr key={day.date}><th scope="row" className="py-1 font-medium">{day.date}</th><td className="py-1 text-right">{day.count.toLocaleString(locale)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}

export { ContributionGrid, contributionDays }
export type { Contribution, ContributionGridProps }
