import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink } from "@/components/ui/pagination";
import { formatNumber } from "@/lib/format";

/** Page numbers to show: first, last, and a window around the current page, with gaps as "…". */
function pageWindow(page: number, last: number): (number | "gap")[] {
  const pages = new Set([1, last, page - 1, page, page + 1].filter((p) => p >= 1 && p <= last));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (const [i, p] of sorted.entries()) {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(p - sorted[i - 1] === 2 ? p - 1 : "gap");
    out.push(p);
  }
  return out;
}

/**
 * Summary ("51–100 of 1,090 users") plus numbered page links.
 * Links keep the other query params (search, filters) and only change `page`.
 */
export function PageNav({
  page,
  pageSize,
  total,
  basePath,
  query = {},
  noun = ["item", "items"],
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  query?: Record<string, string | undefined>;
  noun?: [string, string];
}) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm tabular-nums text-muted-foreground">
        {total > pageSize ? `${formatNumber(from)}–${formatNumber(to)} of ` : ""}
        {formatNumber(total)} {total === 1 ? noun[0] : noun[1]}
      </p>
      {last > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              {page > 1 ? (
                <PaginationLink asChild className="px-2">
                  <Link href={href(page - 1)} aria-label="Previous page">
                    <ChevronLeftIcon />
                  </Link>
                </PaginationLink>
              ) : (
                <PaginationLink aria-label="Previous page" aria-disabled="true" className="px-2">
                  <ChevronLeftIcon />
                </PaginationLink>
              )}
            </PaginationItem>
            {pageWindow(page, last).map((p, i) => (
              <PaginationItem key={p === "gap" ? `gap-${i}` : p}>
                {p === "gap" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink asChild isActive={p === page}>
                    <Link href={href(p)}>{p}</Link>
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              {page < last ? (
                <PaginationLink asChild className="px-2">
                  <Link href={href(page + 1)} aria-label="Next page">
                    <ChevronRightIcon />
                  </Link>
                </PaginationLink>
              ) : (
                <PaginationLink aria-label="Next page" aria-disabled="true" className="px-2">
                  <ChevronRightIcon />
                </PaginationLink>
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

/** Reads a 1-based page number from search params, defaulting to 1. */
export function parsePage(value: string | string[] | undefined) {
  const n = Number(typeof value === "string" ? value : 1);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}
