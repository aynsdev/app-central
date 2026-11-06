import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]", className)}>
      <span aria-hidden="true" className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <circle cx="8" cy="8" r="2" />
          <path d="M8 1.5v2.5M8 12v2.5M1.5 8H4M12 8h2.5" />
        </svg>
      </span>
      App Central
    </span>
  );
}
