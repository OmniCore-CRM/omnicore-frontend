import { useState, useCallback } from "react";
import { apiFetch } from "@/api/client";
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
      const payload = await apiFetch<
        AISuggestion | { success?: boolean; data?: AISuggestion }
      >(
        "/ai/reply-suggestions",
        {
          method: "POST",
          token,
          body: { conversationId },
        }
      );

      // apiFetch may return either the full envelope or the unwrapped data,
      // depending on endpoint response normalization.
      const maybeEnvelope = payload as { success?: boolean; data?: AISuggestion };
      const nextSuggestion =
        maybeEnvelope?.data && typeof maybeEnvelope.data === "object"
          ? maybeEnvelope.data
          : (payload as AISuggestion);

      if (nextSuggestion?.id && nextSuggestion?.suggestion) {
        setSuggestion(nextSuggestion);
        options?.onSuccess?.(nextSuggestion);
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
    async (messageId?: string) => {
      if (!suggestion || !token) return;

      try {
        const trimmedMessageId = messageId?.trim();
        await apiFetch(`/ai/reply-suggestions/${suggestion.id}/accept`, {
          method: "POST",
          token,
          body: trimmedMessageId ? { messageId: trimmedMessageId } : {},
        });

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
      await apiFetch(`/ai/reply-suggestions/${suggestion.id}/reject`, {
        method: "POST",
        token,
      });

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
