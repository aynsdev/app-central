import * as React from "react"
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Native table for dense data. Wide tables scroll inside their container.
 * Numbers: className="text-right tabular-nums" on TableHead and TableCell (or use numeric).
 */
function Table({ className, containerClassName, ...props }: React.ComponentProps<"table"> & { containerClassName?: string }) {
  return (
    <div
      data-slot="table-container"
      // relative: contains absolutely positioned cell content (e.g. sr-only labels)
      className={cn("relative w-full overflow-x-auto rounded-2xl bg-card", containerClassName)}
    >
      <table data-slot="table" className={cn("w-full caption-bottom border-collapse text-sm leading-snug", className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("[&_tr]:border-b [&_tr]:border-border", className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return <tfoot data-slot="table-footer" className={cn("border-t border-border bg-secondary/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border transition-colors motion-reduce:transition-none! duration-(--motion-fast) hover:bg-accent/50 aria-selected:bg-secondary data-[state=selected]:bg-secondary",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, numeric, ...props }: React.ComponentProps<"th"> & { numeric?: boolean }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-4 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:w-px [&:has([role=checkbox])]:pr-0",
        numeric && "text-right",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, numeric, ...props }: React.ComponentProps<"td"> & { numeric?: boolean }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "h-11 px-4 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        numeric && "text-right tabular-nums",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return <caption data-slot="table-caption" className={cn("py-3 text-xs text-muted-foreground", className)} {...props} />
}

/** A sortable header button. Put it inside TableHead and set aria-sort on the TableHead. */
function TableSortButton({
  className,
  direction = "none",
  children,
  ...props
}: React.ComponentProps<"button"> & { direction?: "ascending" | "descending" | "none" }) {
  const Icon = direction === "ascending" ? ArrowUpIcon : direction === "descending" ? ArrowDownIcon : ChevronsUpDownIcon
  return (
    <button
      type="button"
      data-slot="table-sort-button"
      className={cn(
        "-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-medium outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        direction !== "none" && "text-foreground",
        className
      )}
      {...props}
    >
      {children}
      <Icon aria-hidden="true" className={cn("size-3", direction === "none" && "opacity-50")} />
    </button>
  )
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow, TableSortButton }
