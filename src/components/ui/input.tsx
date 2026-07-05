import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

interface InputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: ReactNode;
  endAdornment?: ReactNode;
}

/**
 * Reusable form input.
 *
 * Supports:
 * - labels
 * - validation errors
 * - helper text
 * - react-hook-form integration
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      className,
      type = "text",
      label,
      error,
      hint,
      endAdornment,
      id,
      ...props
    },
    ref,
  ) {
    return (
      <div className="space-y-2">
        {label ? (
          <label
            htmlFor={id}
            className="text-sm font-medium text-oc-text"
          >
            {label}
          </label>
        ) : null}

        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={type}
            className={cn(
              "flex h-11 w-full rounded-xl border border-oc-border bg-oc-panel px-3 text-sm text-oc-text shadow-inner transition-colors placeholder:text-oc-faint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-oc-accent disabled:cursor-not-allowed disabled:opacity-50",
              endAdornment ? "pr-12" : "",
              error &&
                "border-red-500/60 focus-visible:outline-red-500",
              className,
            )}
            {...props}
          />
          {endAdornment ? (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {endAdornment}
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="text-xs text-red-400">{error}</p>
        ) : hint ? (
          <div className="text-xs text-oc-muted">{hint}</div>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
