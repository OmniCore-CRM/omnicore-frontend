"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import { SocketProvider } from "@/components/providers/socket-provider";

function AuthPersistGate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    localStorage.removeItem("omnicore-auth");
    useAuthStore.getState().setHasHydrated(true);
  }, []);
  return <>{children}</>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 45_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <AuthPersistGate>
          <SocketProvider>{children}</SocketProvider>
        </AuthPersistGate>
        <Toaster richColors position="top-right" theme="dark" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
