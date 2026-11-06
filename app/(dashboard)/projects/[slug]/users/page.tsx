import { SearchIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAppUsers } from "@/lib/analytics";
import { formatNumber, formatRelative } from "@/lib/format";
import { getProject } from "@/lib/projects";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };

type Props = PageProps<"/projects/[slug]/users">;

function traitPreview(traits: Record<string, unknown>) {
  const entries = Object.entries(traits).slice(0, 3);
  return entries.map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`).join(" · ");
}

// A disabled <Button> attaches click guards, which a Server Component can't pass,
// so the unavailable state is a plain element styled like the button.
function PageLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) {
    return (
      <span aria-disabled="true" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}>
        {children}
      </span>
    );
  }
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href}>{children}</Link>
    </Button>
  );
}

async function UserTable({ params, searchParams }: Props) {
  const project = await getProject((await params).slug);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : 1) || 1;
  const { users, total, pageSize } = await listAppUsers(project.id, { q, page });
  const base = `/projects/${project.slug}/users`;
  const pageHref = (p: number) => `${base}?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  if (users.length === 0) {
    return (
      <Empty className="rounded-3xl bg-card py-16">
        <EmptyHeader>
          <EmptyMedia>
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>{q ? "No matching users" : "No users yet"}</EmptyTitle>
          <EmptyDescription>
            {q ? "Try a different id or trait value." : "Users appear when your app sends its first event, ping or identify call."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4">
      <Card className="py-2">
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Traits</TableHead>
                <TableHead>Version</TableHead>
                <TableHead numeric>Events</TableHead>
                <TableHead>First seen</TableHead>
                <TableHead>Last seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="max-w-52 truncate font-mono text-[13px]">
                    <Link href={`${base}/${encodeURIComponent(u.id)}`} className="text-foreground underline decoration-border-strong underline-offset-[3px] hover:decoration-current">
                      {u.id}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-72 truncate text-muted-foreground">{traitPreview(u.traits) || "–"}</TableCell>
                  <TableCell className="text-muted-foreground">{[u.platform, u.appVersion].filter(Boolean).join(" ") || "–"}</TableCell>
                  <TableCell numeric>{formatNumber(u.eventCount)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatRelative(u.firstSeenAt)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatRelative(u.lastSeenAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <span className="tabular-nums">
          {formatNumber(total)} {total === 1 ? "user" : "users"}
          {lastPage > 1 && ` · page ${page} of ${lastPage}`}
        </span>
        {lastPage > 1 && (
          <div className="flex gap-2">
            <PageLink href={page > 1 ? pageHref(page - 1) : null}>Previous</PageLink>
            <PageLink href={page < lastPage ? pageHref(page + 1) : null}>Next</PageLink>
          </div>
        )}
      </div>
    </div>
  );
}

async function SearchForm({ searchParams }: Pick<Props, "searchParams">) {
  const sp = await searchParams;
  return (
    <form className="flex max-w-md gap-2" role="search">
      <Input name="q" defaultValue={typeof sp.q === "string" ? sp.q : ""} placeholder="Search by id or trait" aria-label="Search users" />
      <Button type="submit" variant="secondary">
        <SearchIcon /> Search
      </Button>
    </form>
  );
}

export default function UsersPage(props: Props) {
  return (
    <div className="grid gap-6">
      <Suspense fallback={<Skeleton className="h-10 max-w-md" />}>
        <SearchForm searchParams={props.searchParams} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <UserTable {...props} />
      </Suspense>
    </div>
  );
}
