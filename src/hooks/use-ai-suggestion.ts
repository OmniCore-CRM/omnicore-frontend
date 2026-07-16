import { useState, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";

export interface AISuggestion {
  id: string;
  suggestion: string;
  confidence: number;
}

export interface UseAISuggestionOptions {
  onSuccess?: (suggestion: AISuggestion) => void;
  onError?: (error: Error) => void;
}

export function useAISuggestion(
  conversationId: string,
  options?: UseAISuggestionOptions
) {
  const token = useAuthStore((state) => state.accessToken);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSuggestion = useCallback(async () => {
    if (!token) {
      const errorMsg = "Not authenticated";
      setError(errorMsg);
      options?.onError?.(new Error(errorMsg));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/ai/reply-suggestions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ conversationId }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to generate suggestion");
      }

      const data = (await response.json()) as { success: boolean; data: AISuggestion };

      if (data.success && data.data) {
        setSuggestion(data.data);
        options?.onSuccess?.(data.data);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error.message);
      options?.onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [token, conversationId, options]);

  const acceptSuggestion = useCallback(
    async (messageId: string) => {
      if (!suggestion || !token) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/ai/reply-suggestions/${
            suggestion.id
          }/accept`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ messageId }),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to accept suggestion");
        }

        setSuggestion(null);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error.message);
        options?.onError?.(error);
      }
    },
    [suggestion, token, options]
  );

  const rejectSuggestion = useCallback(async () => {
    if (!suggestion || !token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/ai/reply-suggestions/${
          suggestion.id
        }/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to reject suggestion");
      }

      setSuggestion(null);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error.message);
      options?.onError?.(error);
    }
  }, [suggestion, token, options]);

  return {
    suggestion,
    isLoading,
    error,
    generateSuggestion,
    acceptSuggestion,
    rejectSuggestion,
  };
}
