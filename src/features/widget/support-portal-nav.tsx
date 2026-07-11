"use client";

import Link from "next/link";

type SupportPortalNavProps = {
  companySlug: string;
  current: "home" | "help" | "contact";
};

export function SupportPortalNav({ companySlug, current }: SupportPortalNavProps) {
  const slug = companySlug.trim().toLowerCase();

  if (!slug) return null;

  const baseHref = `/support/${encodeURIComponent(slug)}`;
  const items: Array<{
    key: SupportPortalNavProps["current"];
    label: string;
    href: string;
  }> = [
    { key: "home", label: "Home", href: baseHref },
    { key: "help", label: "Help Centre", href: `${baseHref}/help` },
    { key: "contact", label: "Contact Support", href: `${baseHref}/contact` },
  ];

  return (
    <nav aria-label="Support portal navigation" className="flex flex-wrap gap-2">
      {items.map((item) =>
        item.key === current ? (
          <span
            key={item.key}
            aria-current="page"
            className="inline-flex min-h-9 items-center justify-center rounded-full border border-oc-border bg-oc-bg-mid px-4 py-2 text-xs font-semibold text-oc-text"
          >
            {item.label}
          </span>
        ) : (
          <Link
            key={item.key}
            href={item.href}
            className="inline-flex min-h-9 items-center justify-center rounded-full border border-oc-border bg-oc-panel/70 px-4 py-2 text-xs font-semibold text-oc-text transition hover:bg-oc-panel"
          >
            {item.label}
          </Link>
        )
      )}
    </nav>
  );
}
