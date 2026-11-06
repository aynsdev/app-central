"use client";

import { FolderPlusIcon, LayoutGridIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProjectIcon } from "@/components/project-icon";
import { Nav, NavGroup, NavItem, NavLabel } from "@/components/ui/nav";

export function SidebarNav({ projects }: { projects: { name: string; slug: string; icon: string | null }[] }) {
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
              <ProjectIcon name={p.name} src={p.icon} />
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
