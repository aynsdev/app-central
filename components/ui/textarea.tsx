import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm leading-relaxed text-foreground transition-[border-color,box-shadow] motion-reduce:transition-none! duration-(--motion-fast) ease-out outline-none placeholder:text-subtle-foreground pointer-coarse:text-base",
        "hover:border-border-strong focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20",
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20",
        "disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
