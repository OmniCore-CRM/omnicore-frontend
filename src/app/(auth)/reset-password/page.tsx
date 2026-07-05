"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { resetPasswordApi } from "@/api/auth";
import { getErrorMessage } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md border-oc-border bg-oc-panel/90 p-8 shadow-oc-card backdrop-blur">
          <p className="text-center text-sm text-oc-muted">Loading reset form…</p>
        </Card>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = useMemo(() => params.get("token")?.trim() ?? "", [params]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const resetMut = useMutation({ mutationFn: resetPasswordApi });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!token) {
      toast.error("Reset token is missing or invalid");
      return;
    }

    try {
      await resetMut.mutateAsync({
        token,
        password: values.password,
      });
      toast.success("Password reset successful. Please sign in again.");
      router.replace("/login");
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to reset password"));
    }
  });

  return (
    <Card className="w-full max-w-md border-oc-border bg-oc-panel/90 p-8 shadow-oc-card backdrop-blur">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-oc-text">
          Set a new password
        </h1>
        <p className="mt-1 text-sm text-oc-muted">
          Choose a strong password for your OmniCore account.
        </p>
      </div>

      {!token ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          Reset link is missing or invalid. Request a new link to continue.
        </div>
      ) : null}

      <form className="mt-4 space-y-4" onSubmit={onSubmit} noValidate>
        <Input
          id="password"
          label="New password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="••••••••"
          error={form.formState.errors.password?.message}
          endAdornment={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="rounded-md p-1 text-oc-muted transition hover:text-oc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
          {...form.register("password")}
        />

        <Input
          id="confirmPassword"
          label="Confirm new password"
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="••••••••"
          error={form.formState.errors.confirmPassword?.message}
          endAdornment={
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="rounded-md p-1 text-oc-muted transition hover:text-oc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
          {...form.register("confirmPassword")}
        />

        <Button
          type="submit"
          className="w-full cursor-pointer"
          disabled={resetMut.isPending || !token}
        >
          {resetMut.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving password…
            </span>
          ) : (
            "Reset password"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-oc-muted">
        Need a new link?{" "}
        <Link
          href="/forgot-password"
          className="font-medium text-oc-accent-2 transition hover:underline"
        >
          Request reset email
        </Link>
      </p>
    </Card>
  );
}
