import React, { useState } from "react";
import { useAISuggestion } from "@/hooks/use-ai-suggestion";
import { Loader2, Copy, ThumbsDown, Zap } from "lucide-react";

export interface AIReplyButtonProps {
  conversationId: string;
  onSuggestionAccepted?: (suggestion: string) => void;
  onSuggestionRejected?: () => void;
  disabled?: boolean;
}

/**
 * AI Reply Suggestion Button
 *
 * Displays a button to generate AI reply suggestions. When clicked:
 * 1. Shows a loading state
 * 2. Generates a suggestion from the AI provider
 * 3. Displays the suggestion with accept/edit/reject controls
 * 4. Never auto-sends - user must manually accept and then send
 */
export const AIReplyButton: React.FC<AIReplyButtonProps> = ({
  conversationId,
  onSuggestionAccepted,
  onSuggestionRejected,
  disabled = false,
}) => {
  const {
    suggestion,
    isLoading,
    generateSuggestion,
    acceptSuggestion,
    rejectSuggestion,
  } = useAISuggestion(conversationId, {
    onError: (err) => {
      console.error("AI suggestion error:", err);
    },
  });

  const [editedText, setEditedText] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  const handleAcceptClick = async () => {
    if (suggestion) {
      onSuggestionAccepted?.(editedText || suggestion.suggestion);
      await acceptSuggestion("");
      setEditedText("");
      setIsEditing(false);
    }
  };

  const handleRejectClick = async () => {
    await rejectSuggestion();
    onSuggestionRejected?.();
    setEditedText("");
    setIsEditing(false);
  };

  // Show suggestion display if one exists
  if (suggestion && !isEditing) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
              AI Suggestion
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {suggestion.suggestion}
            </p>
            {suggestion.confidence && suggestion.confidence < 70 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Confidence: {Math.round(suggestion.confidence)}%
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              setEditedText(suggestion.suggestion);
              setIsEditing(true);
            }}
            className="text-xs px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Edit
          </button>
          <button
            onClick={handleAcceptClick}
            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-1"
          >
            <Copy className="w-3 h-3" /> Use
          </button>
          <button
            onClick={handleRejectClick}
            className="text-xs px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1"
          >
            <ThumbsDown className="w-3 h-3" /> Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Show edit view if editing
  if (isEditing && suggestion) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
        <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
          Edit Suggestion
        </p>
        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              setEditedText("");
              setIsEditing(false);
            }}
            className="text-xs px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleAcceptClick}
            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-1"
          >
            <Copy className="w-3 h-3" /> Use Edited
          </button>
        </div>
      </div>
    );
  }

  // Show button if no suggestion
  return (
    <button
      onClick={generateSuggestion}
      disabled={disabled || isLoading}
      className={`flex items-center gap-2 text-sm px-3 py-2 rounded border transition ${
        isLoading
          ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 border-gray-300 dark:border-gray-700 cursor-not-allowed"
          : "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900"
      }`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Zap className="w-4 h-4" />
          Suggest Reply
        </>
      )}
    </button>
  );
};

export default AIReplyButton;
