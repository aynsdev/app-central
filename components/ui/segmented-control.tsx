"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

const segmentedItemVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap text-muted-foreground transition-[background-color,color,border-color] motion-reduce:transition-none! duration-(--motion-fast) ease-out outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-[0_1px_2px_rgb(0_0_0/0.06),0_0_0_1px_rgb(0_0_0/0.04)] dark:data-[state=on]:bg-pressed dark:data-[state=on]:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      size: {
        sm: "h-7 px-3 text-xs",
        default: "h-8 px-3.5 text-[13px]",
        lg: "h-10 px-4 text-sm",
      },
    },
    defaultVariants: { size: "default" },
  }
)

const SegmentedContext = React.createContext<VariantProps<typeof segmentedItemVariants>>({ size: "default" })

/**
 * Switches a related mode or filter (view type, range, theme). For moving between views use Tabs.
 * Single selection; arrow keys move between items.
 */
function SegmentedControl({
  className,
  size = "default",
  children,
  value,
  defaultValue,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof ToggleGroupPrimitive.Root>, "type" | "value" | "defaultValue" | "onValueChange"> &
  VariantProps<typeof segmentedItemVariants> & {
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
  }) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "")
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      data-slot="segmented-control"
      value={value ?? internalValue}
      // A segmented control always has a selection: ignore attempts to deselect
      onValueChange={(v) => {
        if (!v) return
        if (value === undefined) setInternalValue(v)
        onValueChange?.(v)
      }}
      className={cn("inline-flex w-fit items-center gap-0.5 rounded-full bg-secondary p-1", className)}
      {...props}
    >
      <SegmentedContext.Provider value={{ size }}>{children}</SegmentedContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function SegmentedControlItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  const { size } = React.useContext(SegmentedContext)
  return (
    <ToggleGroupPrimitive.Item
      data-slot="segmented-control-item"
      className={cn(segmentedItemVariants({ size }), className)}
      {...props}
    />
  )
}

export { SegmentedControl, SegmentedControlItem }
