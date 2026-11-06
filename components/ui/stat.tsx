import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** A KPI: label, value with tabular numerals, and an optional signed delta. */
function Stat({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="stat" className={cn("grid gap-1", className)} {...props} />
}

function StatLabel({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="stat-label" className={cn("text-xs text-muted-foreground", className)} {...props} />
}

function StatValue({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-value"
      className={cn("text-[32px] leading-[1.05] font-bold tracking-[-0.04em] tabular-nums", className)}
      {...props}
    />
  )
}

const statDeltaVariants = cva("text-xs tabular-nums", {
  variants: {
    sentiment: {
      neutral: "text-muted-foreground",
      positive: "text-success",
      negative: "text-destructive",
    },
  },
  defaultVariants: { sentiment: "neutral" },
})

/** Always include the sign or direction in the text. Colour alone is not enough. */
function StatDelta({ className, sentiment, trend, ...props }: React.ComponentProps<"div"> & VariantProps<typeof statDeltaVariants> & { /** Direction only; use sentiment for colour. */ trend?: "up" | "down" | "neutral" }) {
  return <div data-slot="stat-delta" data-trend={trend} className={cn(statDeltaVariants({ sentiment }), className)} {...props} />
}

export { Stat, StatDelta, StatLabel, StatValue }
