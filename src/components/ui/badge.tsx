import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        tone === "neutral" &&
          "border-oc-border bg-oc-elevated text-oc-muted",
        tone === "accent" &&
          "border-violet-500/40 bg-violet-950/50 text-oc-accent-2",
        tone === "success" &&
          "border-emerald-800/60 bg-emerald-950/40 text-emerald-200",
        tone === "warning" &&
          "border-amber-800/50 bg-amber-950/40 text-amber-100",
        tone === "danger" &&
          "border-red-800/50 bg-red-950/40 text-red-200",
        className,
      )}
      {...props}
    />
  );
}
