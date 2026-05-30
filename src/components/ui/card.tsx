import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-oc-border bg-oc-panel shadow-oc-card",
        className,
      )}
      {...props}
    />
  );
}
