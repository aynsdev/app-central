"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/onboarding", label: "Onboarding" },
  { href: "/users", label: "Users" },
  { href: "/events", label: "Events" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export function ProjectTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/projects/${slug}`;
  return (
    // Scrolls sideways on narrow screens, with the scrollbar hidden. The divider is an inset
    // shadow instead of a border so the active underline doesn't overflow and create a vertical scrollbar.
    <nav
      aria-label="Project"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 shadow-[inset_0_-1px_0_var(--border)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map((tab) => {
        const href = base + tab.href;
        const active = tab.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground no-underline transition-colors duration-(--motion-fast) outline-none hover:text-foreground focus-visible:text-foreground",
              active && "border-foreground text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
