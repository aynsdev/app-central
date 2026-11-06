import * as React from "react"
import { CircleAlertIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

/** Groups several fields with consistent vertical rhythm. */
function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-group" className={cn("grid gap-5", className)} {...props} />
}

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return <fieldset data-slot="field-set" className={cn("m-0 grid gap-4 border-0 p-0", className)} {...props} />
}

function FieldLegend({ className, ...props }: React.ComponentProps<"legend">) {
  return (
    <legend data-slot="field-legend" className={cn("mb-4 p-0 text-base font-semibold tracking-[-0.015em] text-foreground", className)} {...props} />
  )
}

/**
 * One label + control + description/error.
 * orientation="horizontal" puts the control beside the label (checkboxes, switches).
 */
function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & { orientation?: "vertical" | "horizontal" }) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(
        "group/field grid min-w-0 gap-2 data-[invalid=true]:text-destructive",
        orientation === "horizontal" && "flex items-start gap-2.5 [&>[data-slot=field-content]]:grid [&>[data-slot=field-content]]:gap-0.5",
        className
      )}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-content" className={cn("grid gap-0.5", className)} {...props} />
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" className={cn("font-medium", className)} {...props} />
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="field-description" className={cn("text-[13px] leading-normal text-muted-foreground", className)} {...props} />
}

/** Say how to fix the problem, not just that there is one. Pair with aria-invalid on the control. */
function FieldError({ className, children, ...props }: React.ComponentProps<"p">) {
  if (!children) return null
  return (
    <p
      role="alert"
      data-slot="field-error"
      className={cn("flex items-start gap-1.5 text-[13px] leading-normal text-destructive", className)}
      {...props}
    >
      <CircleAlertIcon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet }
