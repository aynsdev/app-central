import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground transition-[border-color,box-shadow] motion-reduce:transition-none! duration-(--motion-fast) ease-out outline-none placeholder:text-subtle-foreground pointer-coarse:h-12 pointer-coarse:text-base",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "hover:border-border-strong focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20",
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20",
        "disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground disabled:hover:border-input read-only:bg-secondary",
        className
      )}
      {...props}
    />
  )
}

export { Input }
