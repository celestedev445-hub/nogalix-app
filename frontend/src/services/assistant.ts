import { makeRequest } from "@/lib/makeRequest";
import type { AssistantZone } from "@/lib/assistant";
import type { CvData } from "@/lib/cvTypes";
import type { CvPatch } from "@/lib/cvPatch";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantChatResponse = {
  reply?: string;
  message?: string;
  patch?: CvPatch;
  data?: { reply?: string; patch?: CvPatch };
};

/** Limites du backend : 40 messages max, 4000 caractères par message. */
export const ASSISTANT_HISTORY_LIMIT = 20;
export const ASSISTANT_MESSAGE_MAX_CHARS = 4000;

/** Derniers messages seulement, contenu tronqué (par points de code, sans couper un emoji). */
export function trimAssistantHistory(history: ChatMessage[]): ChatMessage[] {
  return history
    .filter((item) => item && (item.role === "user" || item.role === "assistant"))
    .slice(-ASSISTANT_HISTORY_LIMIT)
    .map((item) => {
      const content = typeof item.content === "string" ? item.content : "";
      const chars = Array.from(content);
      return {
        role: item.role,
        content:
          chars.length > ASSISTANT_MESSAGE_MAX_CHARS
            ? chars.slice(0, ASSISTANT_MESSAGE_MAX_CHARS).join("")
            : content,
      };
    });
}

export async function sendAssistantMessage({
  message,
  history,
  zone,
  cv,
}: {
  message: string;
  history: ChatMessage[];
  zone: AssistantZone;
  cv?: CvData | null;
}) {
  return makeRequest(
    "assistant/chat",
    "POST",
    {
      message,
      history: trimAssistantHistory(history),
      zone,
      ...(zone === "cv" && cv ? { cv } : {}),
    },
    zone === "app" || zone === "cv",
    true,
  ) as Promise<AssistantChatResponse>;
}

export async function sendAssistantAudio(formData: FormData) {
  return makeRequest("assistant/audio", "POST", formData, true, true);
}

export function unwrapAssistantReply(payload: AssistantChatResponse | null | undefined) {
  const reply =
    payload?.reply ||
    payload?.message ||
    payload?.data?.reply ||
    "Je n'ai pas pu répondre pour le moment.";
  const patch = payload?.patch || payload?.data?.patch || {};
  return { reply, patch };
}
