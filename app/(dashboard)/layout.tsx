import { LogOutIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { logoutAction } from "@/app/actions";
import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { requireAdmin } from "@/lib/auth";
import { listProjectNames } from "@/lib/projects";

async function SidebarProjects() {
  const projects = await listProjectNames();
  return <SidebarNav projects={projects} />;
}

async function SidebarAccount() {
  const admin = await requireAdmin();
  return (
    <div className="flex items-center justify-between gap-2 px-3">
      <div className="min-w-0 text-sm">
        <div className="truncate font-medium">{admin.name ?? admin.email}</div>
        {admin.name && <div className="truncate text-xs text-muted-foreground">{admin.email}</div>}
      </div>
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" size="icon-sm" aria-label="Sign out" title="Sign out">
          <LogOutIcon />
        </Button>
      </form>
    </div>
  );
}

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 border-b border-border px-3 py-5 lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:border-r lg:border-b-0">
        <Link href="/" className="px-3 no-underline">
          <Logo />
        </Link>
        <div className="flex-1 overflow-y-auto">
          <Suspense
            fallback={
              <div className="grid gap-2 px-3">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            }
          >
            <SidebarProjects />
          </Suspense>
        </div>
        <div className="grid gap-4">
          <div className="px-3">
            <ThemeSwitcher />
          </div>
          <Suspense fallback={<Skeleton className="mx-3 h-10" />}>
            <SidebarAccount />
          </Suspense>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
