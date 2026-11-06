import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Vertical navigation for app sidebars. The active item is marked with isActive (aria-current="page")
 * and shown through foreground and surface, not a bright pill.
 */
function Nav({ className, ...props }: React.ComponentProps<"nav">) {
  return <nav data-slot="nav" className={cn("grid gap-px", className)} {...props} />
}

function NavGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="nav-group" className={cn("grid gap-px not-first:mt-4", className)} {...props} />
}

function NavLabel({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="nav-label" className={cn("px-3 pb-1.5 text-xs font-medium text-subtle-foreground", className)} {...props} />
}

function NavItem({
  className,
  asChild = false,
  isActive = false,
  ...props
}: React.ComponentProps<"a"> & { asChild?: boolean; isActive?: boolean }) {
  const Comp = asChild ? Slot.Root : "a"
  return (
    <Comp
      data-slot="nav-item"
      data-active={isActive}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex h-9 min-w-0 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted-foreground no-underline transition-colors motion-reduce:transition-none! duration-(--motion-fast) outline-none pointer-coarse:h-11",
        "hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        "aria-[current=page]:bg-secondary aria-[current=page]:text-foreground",
        "[&>span:not([data-slot])]:truncate [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

/** Trailing count or shortcut inside a NavItem. */
function NavBadge({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="nav-badge" className={cn("ml-auto text-xs text-subtle-foreground tabular-nums", className)} {...props} />
}

export { Nav, NavBadge, NavGroup, NavItem, NavLabel }
