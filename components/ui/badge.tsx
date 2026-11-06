import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs leading-none font-medium whitespace-nowrap tabular-nums [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-secondary text-muted-foreground",
        outline: "border border-border text-muted-foreground",
        solid: "bg-primary text-primary-foreground",
        success: "bg-success/12 text-success",
        warning: "bg-warning/12 text-warning",
        destructive: "bg-destructive/12 text-destructive",
        info: "bg-info/12 text-info",
        brand: "bg-brand-soft text-brand-soft-foreground",
      },
      size: {
        default: "",
        sm: "h-5 px-2 text-[11px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

/** Status and metadata. Pair status colour with text, never colour alone. */
function Badge({
  className,
  variant,
  size,
  dot = false,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    /** Leading dot in the current colour. */
    dot?: boolean
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "span"
  return (
    <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && !asChild && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {children}
    </Comp>
  )
}

export { Badge, badgeVariants }
