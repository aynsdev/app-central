"use client";

import { useActionState } from "react";
import { loginAction, setupAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!state?.error} />
          <FieldError>{state?.error}</FieldError>
        </Field>
        <Button type="submit" loading={pending} className="w-full">
          Sign in
        </Button>
      </FieldGroup>
    </form>
  );
}

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAction, undefined);
  return (
    <form action={action}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" name="name" autoComplete="name" />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
          <FieldDescription>At least 10 characters.</FieldDescription>
        </Field>
        <FieldError>{state?.error}</FieldError>
        <Button type="submit" loading={pending} className="w-full">
          Create admin account
        </Button>
      </FieldGroup>
    </form>
  );
}
