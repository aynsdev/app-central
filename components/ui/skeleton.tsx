import * as React from "react"

import { cn } from "@/lib/utils"

/** Mirror the real layout so nothing jumps when content arrives. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("h-3 animate-pulse motion-reduce:animate-none! rounded-md bg-secondary", className)}
      {...props}
    />
  )
}

export { Skeleton }
