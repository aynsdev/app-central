import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm leading-none font-medium tracking-[-0.01em] whitespace-nowrap transition-[background-color,border-color,color,scale] motion-reduce:transition-none! duration-(--motion-fast) ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 aria-busy:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/88 active:bg-primary/78",
        outline: "border border-border bg-card text-foreground hover:border-border-strong active:bg-secondary",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent active:bg-pressed",
        ghost: "text-foreground hover:bg-accent active:bg-pressed",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 focus-visible:ring-destructive",
        "destructive-soft":
          "bg-destructive/10 text-destructive hover:bg-destructive/15 active:bg-destructive/20 focus-visible:ring-destructive",
        brand: "bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-pressed",
        link: "h-auto! rounded-none px-0! text-foreground underline decoration-border-strong underline-offset-[3px] hover:decoration-current active:scale-100",
      },
      size: {
        xs: "h-7 gap-1.5 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 px-3.5 text-[13px] [&_svg:not([class*='size-'])]:size-3.5",
        default: "h-10 px-5",
        lg: "h-12 px-6 text-[15px] [&_svg:not([class*='size-'])]:size-[18px]",
        xl: "h-14 px-7 text-base [&_svg:not([class*='size-'])]:size-5",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        icon: "size-10",
        "icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-[18px]",
      },
    },
    compoundVariants: [
      // Icon buttons: muted glyph, and a 44px touch target on coarse pointers
      {
        size: ["icon-xs", "icon-sm", "icon", "icon-lg"],
        className:
          "pointer-coarse:after:absolute pointer-coarse:after:top-1/2 pointer-coarse:after:left-1/2 pointer-coarse:after:size-11 pointer-coarse:after:-translate-x-1/2 pointer-coarse:after:-translate-y-1/2",
      },
      {
        variant: "ghost",
        size: ["icon-xs", "icon-sm", "icon", "icon-lg"],
        className: "text-muted-foreground hover:text-foreground aria-pressed:bg-pressed aria-pressed:text-foreground",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  children,
  disabled,
  onClickCapture,
  onKeyDownCapture,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Shows a spinner, keeps the button's width, and blocks repeat clicks. */
    loading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"
  // Only attach the guards while blocked, so an idle Button can render from a
  // React Server Component (event handlers can't cross that boundary).
  const blocked = Boolean(loading || disabled)

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
      disabled={!asChild ? disabled || loading : undefined}
      aria-disabled={disabled || loading || undefined}
      onClickCapture={
        blocked
          ? (event) => { event.preventDefault(); event.stopPropagation() }
          : onClickCapture
      }
      onKeyDownCapture={
        blocked
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault(); event.stopPropagation(); return
              }
              onKeyDownCapture?.(event)
            }
          : onKeyDownCapture
      }
    >
      {loading && !asChild ? (
        <>
          <span className="opacity-0 inline-flex items-center gap-[inherit]">{children}</span>
          <span
            aria-hidden="true"
            className="absolute inset-0 m-auto size-4 animate-spin motion-reduce:animate-none! rounded-full border-[1.75px] border-current border-r-transparent"
          />
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
