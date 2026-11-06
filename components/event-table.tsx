import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EventRow } from "@/lib/analytics";
import { formatDateTime } from "@/lib/format";

function Properties({ value }: { value: Record<string, unknown> }) {
  const entries = Object.entries(value);
  if (entries.length === 0) return <span className="text-subtle-foreground">–</span>;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs">
      {entries.slice(0, 6).map(([k, v]) => (
        <span key={k} className="max-w-64 truncate">
          <span className="text-muted-foreground">{k}=</span>
          {typeof v === "string" ? v : JSON.stringify(v)}
        </span>
      ))}
      {entries.length > 6 && <span className="text-muted-foreground">+{entries.length - 6} more</span>}
    </span>
  );
}

export function EventTable({ events, slug, timezone, showUser = true }: { events: EventRow[]; slug: string; timezone: string; showUser?: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Event</TableHead>
          {showUser && <TableHead>User</TableHead>}
          <TableHead>Properties</TableHead>
          <TableHead>Version</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">{formatDateTime(e.occurredAt, timezone)}</TableCell>
            <TableCell className="font-mono text-[13px] whitespace-nowrap">{e.name}</TableCell>
            {showUser && (
              <TableCell className="max-w-44 truncate font-mono text-[13px]">
                <Link href={`/projects/${slug}/users/${encodeURIComponent(e.userId)}`} className="text-foreground underline decoration-border-strong underline-offset-[3px] hover:decoration-current">
                  {e.userId}
                </Link>
              </TableCell>
            )}
            <TableCell>
              <Properties value={e.properties} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-muted-foreground">{e.appVersion ?? "–"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
