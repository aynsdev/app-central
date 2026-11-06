import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]", className)}>
      <Image src="/brand/logo.svg" alt="" width={28} height={28} className="size-7 shrink-0" />
      App Central
    </span>
  );
}
