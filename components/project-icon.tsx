import { cn } from "@/lib/utils";

const sizes = {
  sm: "size-5 rounded-md text-[11px]",
  md: "size-9 rounded-xl text-sm",
  lg: "size-12 rounded-2xl text-lg",
};

/** A project's logo, or its first letter when no logo is uploaded. */
export function ProjectIcon({ name, src, size = "sm", className }: { name: string; src: string | null; size?: keyof typeof sizes; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("grid shrink-0 place-items-center overflow-hidden bg-secondary font-semibold uppercase", sizes[size], className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- authenticated, already-small image; the optimizer would need to forward the session cookie
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        name.slice(0, 1)
      )}
    </span>
  );
}
