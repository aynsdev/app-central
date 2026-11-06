import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="Pagination" data-slot="pagination" className={cn("flex", className)} {...props} />
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="pagination-content" className={cn("m-0 flex list-none items-center gap-1 p-0", className)} {...props} />
}

function PaginationItem(props: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

const pageClass =
  "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-full px-3 text-sm text-muted-foreground tabular-nums no-underline transition-colors motion-reduce:transition-none! duration-(--motion-fast) outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-disabled:pointer-events-none aria-disabled:opacity-40 aria-[current=page]:bg-secondary aria-[current=page]:font-semibold aria-[current=page]:text-foreground [&_svg]:size-3.5"

/** Use an <a href>, or pass asChild to wrap your router's Link, so pages are linkable. */
function PaginationLink({
  className,
  isActive,
  asChild = false,
  ...props
}: React.ComponentProps<"a"> & { isActive?: boolean; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "a"
  return (
    <Comp
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(pageClass, className)}
      {...props}
    />
  )
}

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink aria-label="Previous page" className={cn("px-2", className)} {...props}>
      <ChevronLeftIcon />
    </PaginationLink>
  )
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink aria-label="Next page" className={cn("px-2", className)} {...props}>
      <ChevronRightIcon />
    </PaginationLink>
  )
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span aria-hidden="true" data-slot="pagination-ellipsis" className={cn("flex size-9 items-center justify-center text-muted-foreground", className)} {...props}>
      <MoreHorizontalIcon className="size-3.5" />
    </span>
  )
}

export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious }
