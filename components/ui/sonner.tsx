"use client"

import { CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon } from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Mount once near the root, then call toast() from "sonner" anywhere.
 * Short and factual ("Changes saved"); errors say what failed and how to recover.
 */
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      gap={8}
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4 text-info" />,
        warning: <TriangleAlertIcon className="size-4 text-warning" />,
        error: <CircleAlertIcon className="size-4 text-destructive" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-(--width) items-start gap-3 rounded-2xl bg-popover py-3.5 pr-12 pl-4 text-sm text-popover-foreground shadow-popover",
          icon: "mt-0.5 shrink-0",
          content: "grid min-w-0 flex-1 gap-0.5",
          title: "font-medium leading-snug",
          description: "text-[13px] leading-normal text-muted-foreground",
          actionButton:
            "inline-flex h-7 shrink-0 items-center rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/88",
          cancelButton:
            "inline-flex h-7 shrink-0 items-center rounded-full px-3 text-xs font-medium text-muted-foreground hover:bg-accent",
          closeButton:
            "absolute top-2 right-2 grid size-6 pointer-coarse:size-11 place-items-center rounded-full text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent hover:text-foreground [&_svg]:size-3.5",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
