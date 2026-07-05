"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { registerApi } from "@/api/auth";
import { getErrorMessage } from "@/api/errors";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const registerSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      companyName: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  const registerMutation = useMutation({ mutationFn: registerApi });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const data = await registerMutation.mutateAsync(values);
      // Register already returns accessToken + user + company — no /auth/me needed.
      setSession(data);
      toast.success(`Welcome to OmniCore, ${data.user.firstName}`);
      router.replace("/inbox");
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[register] flow failed", err);
      }
      toast.error(getErrorMessage(err, "Unable to create account"));
    }
  });

  return (
    <Card className="w-full max-w-md border-oc-border bg-oc-panel/90 p-8 shadow-oc-card backdrop-blur">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 ring-1 ring-violet-500/40">
          <span className="h-2.5 w-2.5 rounded-full bg-oc-accent-2 shadow-[0_0_12px_rgba(210,187,255,0.7)]" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-oc-text">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-oc-muted">
          Create your company account and manage customer conversations from one
          unified inbox.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={onSubmit}
        noValidate
      >
        <Input
          label="Company name"
          placeholder="Acme Support"
          error={errors.companyName?.message}
          {...register("companyName")}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            placeholder="Abraham"
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <Input
            label="Last name"
            placeholder="Ogbu"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>

        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.password?.message}
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
          {...register("password")}
        />

        <Button
          type="submit"
          className="w-full cursor-pointer"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account…
            </span>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-oc-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-oc-accent-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </Card>
  );
}
