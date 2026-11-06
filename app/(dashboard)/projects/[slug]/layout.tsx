import { Suspense } from "react";
import { ProjectTabs } from "@/components/project-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getProject } from "@/lib/projects";

async function ProjectTitle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  return (
    <div className="grid gap-1">
      <h1 className="text-2xl font-semibold tracking-[-0.025em]">{project.name}</h1>
      {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
    </div>
  );
}

async function Tabs({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProjectTabs slug={slug} />;
}

export default function ProjectLayout({ children, params }: LayoutProps<"/projects/[slug]">) {
  return (
    <div className="grid gap-8">
      <div className="grid gap-5">
        <Suspense fallback={<Skeleton className="h-8 w-48" />}>
          <ProjectTitle params={params} />
        </Suspense>
        <Suspense fallback={<div className="h-11 border-b border-border" />}>
          <Tabs params={params} />
        </Suspense>
      </div>
      {children}
    </div>
  );
}
