import type { Attachment, Message } from "@/types/models";

export type ConversationTimelineItem =
  | {
      type: "message";
      id: string;
      createdAt: string;
      message: Message;
    }
  | {
      type: "attachment";
      id: string;
      createdAt: string;
      attachment: Attachment;
    };

const timestamp = (value: string) => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

export function buildConversationTimeline(
  messages: Message[],
  attachments: Attachment[],
) {
  return [
    ...messages.map(
      (message): ConversationTimelineItem => ({
        type: "message",
        id: message.id,
        createdAt: message.createdAt,
        message,
      }),
    ),
    ...attachments.map(
      (attachment): ConversationTimelineItem => ({
        type: "attachment",
        id: attachment.id,
        createdAt: attachment.createdAt,
        attachment,
      }),
    ),
  ].sort(
    (a, b) =>
      timestamp(a.createdAt) - timestamp(b.createdAt) ||
      a.type.localeCompare(b.type) ||
      a.id.localeCompare(b.id),
  );
}
