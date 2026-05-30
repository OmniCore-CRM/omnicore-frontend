
/**
 * Socket.IO event names.
 *
 * These constants must stay aligned with the backend realtime gateway.
 * Current backend supports realtime messaging through the `new_message` event.
 */
export const SOCKET_EVENTS = {
  NEW_MESSAGE: "new_message",
  MESSAGE_STATUS_UPDATED: "message_status_updated",

  // Planned realtime events
  CONVERSATION_UPDATED: "conversation:updated",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
  INBOX_REFRESH: "inbox:refresh",

  // Conversation room architecture
  JOIN_CONVERSATION: "join_conversation",
} as const;
