import * as React from "react"
import { cn } from "@/lib/utils"

function ActivityFeed({ className, ...props }: React.ComponentProps<"ol">) { return <ol data-slot="activity-feed" className={cn("grid list-none gap-6 p-0", className)} {...props} /> }
function ActivityFeedItem({ className, ...props }: React.ComponentProps<"li">) { return <li data-slot="activity-feed-item" className={cn("flex min-w-0 gap-3", className)} {...props} /> }
function ActivityFeedIndicator({ className, ...props }: React.ComponentProps<"div">) { return <div aria-hidden="true" data-slot="activity-feed-indicator" className={cn("grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground [&_svg]:size-4", className)} {...props} /> }
function ActivityFeedContent({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="activity-feed-content" className={cn("grid min-w-0 flex-1 gap-1 text-sm text-pretty", className)} {...props} /> }
function ActivityFeedTime({ className, ...props }: React.ComponentProps<"time">) { return <time data-slot="activity-feed-time" className={cn("text-xs tabular-nums text-muted-foreground", className)} {...props} /> }
export { ActivityFeed, ActivityFeedItem, ActivityFeedIndicator, ActivityFeedContent, ActivityFeedTime }
