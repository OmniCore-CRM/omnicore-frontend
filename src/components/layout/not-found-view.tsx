"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function NotFoundView() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-oc-bg px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-180px] h-[360px] w-[520px] -translate-x-1/2 rounded-full bg-violet-500/12 blur-3xl" />
        <div className="absolute bottom-[-200px] right-[-120px] h-[320px] w-[320px] rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-xl border-oc-border/80 bg-oc-panel/95 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur sm:p-8">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-violet-400/40 bg-violet-500/10">
          <span className="h-2.5 w-2.5 rounded-full bg-oc-accent-2 shadow-[0_0_18px_rgba(210,187,255,0.9)]" />
        </div>

        <p className="text-xs font-medium uppercase tracking-[0.16em] text-oc-faint">
          Page not found
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-oc-text sm:text-3xl">
          This page isn&apos;t here yet.
        </h1>
        <p className="mt-3 max-w-lg text-sm text-oc-muted sm:text-base">
          No worries. The link may be outdated, or the page may have moved. Choose where you want to go next.
        </p>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link href="/inbox" className="inline-flex">
            <Button type="button" variant="primary" className="cursor-pointer">
              <Inbox className="h-4 w-4" />
              Go to Inbox
            </Button>
          </Link>
          <Link href="/my-work" className="inline-flex">
            <Button type="button" variant="secondary" className="cursor-pointer">
              <BriefcaseBusiness className="h-4 w-4" />
              Go to My Work
            </Button>
          </Link>
          <Button
            type="button"
            variant="ghost"
            className="cursor-pointer"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        </div>
      </Card>
    </div>
  );
}
