"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { fetchCurrentSession, loginApi } from "@/api/auth";
import { getErrorMessage } from "@/api/errors";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated && accessToken) router.replace("/inbox");
  }, [accessToken, hasHydrated, router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const loginMut = useMutation({ mutationFn: loginApi });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const data = await loginMut.mutateAsync(values);
      const session = await fetchCurrentSession(data.accessToken);
      setSession({
        accessToken: data.accessToken,
        user: session.user,
        company: session.company,
      });
      toast.success(`Welcome back, ${session.user.firstName}`);
      router.replace("/inbox");
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[login] flow failed", err);
      }
      toast.error(getErrorMessage(err, "Unable to sign in"));
    }
  });

  return (
    <Card className="w-full max-w-md border-oc-border bg-oc-panel/90 p-8 shadow-oc-card backdrop-blur">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 ring-1 ring-violet-500/40">
          <span className="h-2.5 w-2.5 rounded-full bg-oc-accent-2 shadow-[0_0_12px_rgba(210,187,255,0.7)]" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-oc-text">
          Sign in to OmniCore
        </h1>
        <p className="mt-1 text-sm text-oc-muted">
          Unified omnichannel inbox for modern support teams.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={onSubmit}
        noValidate
      >
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-oc-muted" htmlFor="email">
            Work email
          </label>
          <Input
            id="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-oc-danger">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label
            className="text-xs font-medium text-oc-muted"
            htmlFor="password"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-oc-danger">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={loginMut.isPending}
        >
          {loginMut.isPending ? "Signing in…" : "Continue"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-oc-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-oc-accent-2 hover:underline"
        >
          Create company account
        </Link>
      </p>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-oc-border" />
        <span className="text-[11px] uppercase tracking-wide text-oc-faint">
          or continue with
        </span>
        <div className="h-px flex-1 bg-oc-border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled
          title="TODO: connect Google OAuth with backend"
        >
          Google
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled
          title="TODO: connect Microsoft OAuth with backend"
        >
          Microsoft
        </Button>
      </div>

      <p className="mt-8 text-center text-xs text-oc-faint">
        <span className="text-oc-muted">
          Forgot password flow coming soon
        </span>{" "}
        · Enterprise SSO available on request
      </p>
    </Card>
  );
}
