import type { Metadata } from "next";
import { CreateProjectForm } from "@/components/forms/project-forms";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <div className="grid max-w-2xl gap-8">
      <PageHeader title="New project" description="One project per app. You'll get an ingest key to put in the app next." />
      <Card>
        <CardContent>
          <CreateProjectForm />
        </CardContent>
      </Card>
    </div>
  );
}
