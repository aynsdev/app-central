"use client"

import * as React from "react"
import { AlertDialog as Primitive } from "radix-ui"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function AlertDialog(props: React.ComponentProps<typeof Primitive.Root>) { return <Primitive.Root {...props} /> }
function AlertDialogTrigger(props: React.ComponentProps<typeof Primitive.Trigger>) { return <Primitive.Trigger data-slot="alert-dialog-trigger" {...props} /> }
function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal>
    <Primitive.Overlay data-slot="alert-dialog-overlay" className="fixed inset-0 z-50 bg-overlay" />
    <Primitive.Content data-slot="alert-dialog-content" className={cn("fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-4rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-5 overflow-auto rounded-3xl bg-popover p-6 text-popover-foreground shadow-dialog outline-none sm:max-w-lg", className)} {...props} />
  </Primitive.Portal>
}
function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="alert-dialog-header" className={cn("grid gap-2", className)} {...props} /> }
function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="alert-dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} /> }
function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof Primitive.Title>) { return <Primitive.Title className={cn("text-lg font-semibold text-balance", className)} {...props} /> }
function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof Primitive.Description>) { return <Primitive.Description className={cn("text-sm text-pretty text-muted-foreground", className)} {...props} /> }
function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof Primitive.Cancel>) { return <Primitive.Cancel className={cn(buttonVariants({ variant: "secondary" }), className)} {...props} /> }
/** For async operations, preventDefault on click and close the controlled dialog only after success. */
function AlertDialogAction({ className, ...props }: React.ComponentProps<typeof Primitive.Action>) { return <Primitive.Action className={cn(buttonVariants({ variant: "destructive" }), className)} {...props} /> }
export { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction }
