import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SetupForm } from "@/components/forms/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { hasAnyAdmin } from "@/lib/auth";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Set up" };

async function Gate() {
  await connection();
  if (await hasAnyAdmin()) redirect("/login");
  return <SetupForm />;
}

export default function SetupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to App Central</CardTitle>
        <CardDescription>Create the admin account for this instance. This page is only available once.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <Gate />
        </Suspense>
      </CardContent>
    </Card>
  );
}
