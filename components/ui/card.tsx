import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * A filled surface with generous corners. Hierarchy comes from content; never nest cards.
 * For a clickable card: <Card asChild interactive><a href="…">…</a></Card>
 */
function Card({
  className,
  asChild = false,
  interactive = false,
  density = "comfortable",
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean; interactive?: boolean; density?: "comfortable" | "compact" }) {
  const Comp = asChild ? Slot.Root : "div"
  return (
    <Comp
      data-slot="card"
      data-density={density}
      className={cn(
        "flex min-w-0 flex-col gap-5 rounded-3xl bg-card py-6 text-card-foreground",
        density === "compact" && "gap-3 rounded-2xl py-4 [&>[data-slot]]:px-4",
        interactive &&
          "cursor-pointer no-underline transition-shadow motion-reduce:transition-none! duration-(--motion-fast) ease-out outline-none hover:shadow-[0_0_0_1px_var(--border-strong)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-base leading-snug font-semibold tracking-[-0.015em]", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-description" className={cn("text-sm leading-normal text-muted-foreground", className)} {...props} />
}

/** Trailing element in the header: an icon button, badge or menu. */
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-6", className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center justify-end gap-2 px-6", className)}
      {...props}
    />
  )
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
