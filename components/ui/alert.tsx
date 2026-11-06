import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-1 rounded-2xl px-4 py-3.5 text-sm has-[>svg]:grid-cols-[16px_1fr] has-[>svg]:gap-x-3 has-data-[slot=alert-action]:pr-28 [&>svg]:mt-0.5 [&>svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground [&>svg]:text-muted-foreground",
        info: "bg-info/10 [&>svg]:text-info",
        success: "bg-success/10 [&>svg]:text-success",
        warning: "bg-warning/12 [&>svg]:text-warning",
        destructive: "bg-destructive/10 [&>svg]:text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

/** Inline message about the state of a page or task. Name what happened and the recovery step. */
function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role={variant === "destructive" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-title" className={cn("col-start-2 leading-snug font-semibold text-foreground", className)} {...props} />
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="alert-description" className={cn("col-start-2 leading-normal text-muted-foreground [&_p]:leading-normal", className)} {...props} />
  )
}

/** One action, usually a small outline Button. */
function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-action" className={cn("absolute top-1/2 right-3.5 -translate-y-1/2", className)} {...props} />
}

export { Alert, AlertAction, AlertDescription, AlertTitle }
