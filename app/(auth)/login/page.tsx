import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/forms/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdmin, hasAnyAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

async function Gate() {
  if (await getAdmin()) redirect("/");
  if (!(await hasAnyAdmin())) redirect("/setup");
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Monitor every app you ship from one place.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-52 w-full" />}>
          <Gate />
        </Suspense>
      </CardContent>
    </Card>
  );
}
