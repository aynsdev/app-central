"use client";

import { FolderPlusIcon, LayoutGridIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Nav, NavGroup, NavItem, NavLabel } from "@/components/ui/nav";

export function SidebarNav({ projects }: { projects: { name: string; slug: string }[] }) {
  const pathname = usePathname();
  return (
    <Nav>
      <NavGroup>
        <NavItem asChild isActive={pathname === "/"}>
          <Link href="/">
            <LayoutGridIcon />
            <span>All projects</span>
          </Link>
        </NavItem>
      </NavGroup>
      <NavGroup>
        <NavLabel>Projects</NavLabel>
        {projects.map((p) => (
          <NavItem key={p.slug} asChild isActive={pathname.startsWith(`/projects/${p.slug}`)}>
            <Link href={`/projects/${p.slug}`}>
              <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-md bg-secondary text-[11px] font-semibold uppercase">
                {p.name.slice(0, 1)}
              </span>
              <span>{p.name}</span>
            </Link>
          </NavItem>
        ))}
        <NavItem asChild isActive={pathname === "/projects/new"}>
          <Link href="/projects/new">
            <FolderPlusIcon />
            <span>New project</span>
          </Link>
        </NavItem>
      </NavGroup>
    </Nav>
  );
}
