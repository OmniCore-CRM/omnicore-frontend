import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", disabled, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-40",
          variant === "primary" &&
            "bg-oc-accent text-white shadow-oc-card hover:bg-violet-600",
          variant === "secondary" &&
            "bg-oc-elevated text-oc-text border border-oc-border hover:bg-oc-panel",
          variant === "outline" &&
            "border border-oc-border bg-transparent text-oc-text hover:bg-oc-panel",
          variant === "ghost" &&
            "bg-transparent text-oc-muted hover:bg-oc-panel hover:text-oc-text",
          variant === "danger" &&
            "bg-red-900/40 text-red-200 border border-red-800/60 hover:bg-red-900/60",
          size === "sm" && "h-9 px-3 text-sm",
          size === "md" && "h-10 px-4 text-sm",
          size === "lg" && "h-11 px-5 text-sm",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
