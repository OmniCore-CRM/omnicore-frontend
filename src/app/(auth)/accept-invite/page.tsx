"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { acceptInviteApi, validateInviteTokenApi } from "@/api/auth";
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

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md border-oc-border bg-oc-panel/90 p-8 shadow-oc-card backdrop-blur">
          <p className="text-center text-sm text-oc-muted">Loading invite...</p>
        </Card>
      }
    >
      <AcceptInviteForm />
    </Suspense>
  );
}

function AcceptInviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = useMemo(() => params.get("token")?.trim() ?? "", [params]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const inviteQuery = useQuery({
    queryKey: ["invite-token", token],
    queryFn: () => validateInviteTokenApi(token),
    enabled: token.length > 0,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: acceptInviteApi,
    onSuccess: () => {
      toast.success("Invite accepted. You can now sign in.");
      router.replace("/login");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not accept invite"));
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!token) {
      toast.error("Invite token is missing or invalid");
      return;
    }

    await acceptMutation.mutateAsync({
      token,
      password: values.password,
    });
  });

  return (
    <Card className="w-full max-w-md border-oc-border bg-oc-panel/90 p-8 shadow-oc-card backdrop-blur">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-oc-text">
          Accept your invite
        </h1>
        <p className="mt-1 text-sm text-oc-muted">
          Set your password to activate your OmniCore account.
        </p>
      </div>

      {!token && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          Invite link is missing or invalid.
        </div>
      )}

      {inviteQuery.isLoading && token && (
        <p className="text-center text-sm text-oc-muted">Validating invite link...</p>
      )}

      {inviteQuery.error && token && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {getErrorMessage(inviteQuery.error, "Invite link is invalid or expired")}
        </div>
      )}

      {inviteQuery.data && (
        <div className="mb-4 rounded-xl border border-oc-border bg-oc-bg/40 p-3 text-sm text-oc-muted">
          <p className="font-medium text-oc-text">
            {inviteQuery.data.firstName} {inviteQuery.data.lastName}
          </p>
          <p>{inviteQuery.data.email}</p>
          <p className="mt-1">Company: {inviteQuery.data.companyName}</p>
        </div>
      )}

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Input
          id="password"
          label="New password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          error={form.formState.errors.password?.message}
          endAdornment={
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
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
          disabled={!token || !!inviteQuery.error || acceptMutation.isPending}
          {...form.register("password")}
        />

        <Input
          id="confirmPassword"
          label="Confirm new password"
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          error={form.formState.errors.confirmPassword?.message}
          endAdornment={
            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
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
          disabled={!token || !!inviteQuery.error || acceptMutation.isPending}
          {...form.register("confirmPassword")}
        />

        <Button
          type="submit"
          className="w-full cursor-pointer"
          disabled={!token || !!inviteQuery.error || acceptMutation.isPending}
        >
          {acceptMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Activating account...
            </span>
          ) : (
            "Activate account"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-oc-muted">
        Already set up?{" "}
        <Link href="/login" className="font-medium text-oc-accent-2 transition hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
