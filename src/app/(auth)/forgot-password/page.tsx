"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { forgotPasswordApi } from "@/api/auth";
import { getErrorMessage } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const forgotMut = useMutation({ mutationFn: forgotPasswordApi });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await forgotMut.mutateAsync(values);
      toast.success("If an account exists, a reset link has been sent");
      form.reset({ email: values.email });
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to process password reset request"));
    }
  });

  return (
    <Card className="w-full max-w-md border-oc-border bg-oc-panel/90 p-8 shadow-oc-card backdrop-blur">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-oc-text">
          Forgot your password?
        </h1>
        <p className="mt-1 text-sm text-oc-muted">
          Enter your work email and we will send a secure reset link.
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Input
          id="email"
          label="Work email"
          autoComplete="email"
          placeholder="you@company.com"
          error={form.formState.errors.email?.message}
          {...form.register("email")}
        />

        <Button
          type="submit"
          className="w-full cursor-pointer"
          disabled={forgotMut.isPending}
        >
          {forgotMut.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending reset link…
            </span>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-oc-muted">
        Remembered your password?{" "}
        <Link
          href="/login"
          className="font-medium text-oc-accent-2 transition hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}
