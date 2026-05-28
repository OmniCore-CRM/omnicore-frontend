import { cn } from "@/lib/utils";

export function Avatar({
  src,
  name,
  size = 36,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const safeName =
    typeof name === "string" && name.trim().length > 0
      ? name.trim()
      : "Unknown User";

  const initials = safeName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={cn(
          "rounded-full object-cover ring-1 ring-oc-border",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-oc-elevated text-[11px] font-semibold text-oc-accent-2 ring-1 ring-oc-border",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
}