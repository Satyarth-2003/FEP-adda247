import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      <span className="text-[15px] font-bold tracking-tight text-fg">FEP</span>
      <span className="h-4 w-px bg-fg-dim/40" aria-hidden />
      <span
        className="text-[15px] font-semibold tracking-tight"
        style={{ color: "var(--brand)" }}
      >
        Adda<span className="text-fg/95">247</span>
      </span>
    </div>
  );
}
