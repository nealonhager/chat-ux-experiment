export const DEFAULT_CHAT_MODEL = "gpt-4o-mini";

export const CHAT_MODELS = [
  { id: "gpt-5.5", label: "GPT-5.5" },
  { id: "gpt-5.5-pro", label: "GPT-5.5 pro" },
  { id: "gpt-5.4", label: "GPT-5.4" },
  { id: "gpt-5.4-pro", label: "GPT-5.4 pro" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 mini" },
  { id: "gpt-5.4-nano", label: "GPT-5.4 nano" },
  { id: "gpt-5.3-chat-latest", label: "GPT-5.3 Chat" },
  { id: "gpt-5.2", label: "GPT-5.2" },
  { id: "gpt-5.2-pro", label: "GPT-5.2 pro" },
  { id: "gpt-5.2-chat-latest", label: "GPT-5.2 Chat" },
  { id: "gpt-5.1", label: "GPT-5.1" },
  { id: "gpt-5.1-chat-latest", label: "GPT-5.1 Chat" },
  { id: "gpt-5", label: "GPT-5" },
  { id: "gpt-5-pro", label: "GPT-5 pro" },
  { id: "gpt-5-mini", label: "GPT-5 mini" },
  { id: "gpt-5-nano", label: "GPT-5 nano" },
  { id: "gpt-4o-mini", label: "GPT-4o mini" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4.1-nano", label: "GPT-4.1 nano" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "o3-pro", label: "o3 pro" },
  { id: "o3", label: "o3" },
  { id: "o3-mini", label: "o3 mini" },
  { id: "o4-mini", label: "o4 mini" },
  { id: "o1", label: "o1" },
  { id: "o1-mini", label: "o1 mini" },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];

export const CHAT_MODEL_ITEMS = CHAT_MODELS.map((entry) => ({
  value: entry.id,
  label: entry.label,
}));

export const CHAT_MODEL_STORAGE_KEY = "gpt-chat-model";

export function isAllowedChatModel(model: string): model is ChatModelId {
  return CHAT_MODELS.some((entry) => entry.id === model);
}

export function resolveChatModel(model: string | undefined): ChatModelId {
  if (model && isAllowedChatModel(model)) {
    return model;
  }

  return DEFAULT_CHAT_MODEL;
}

export function getStoredChatModel(): ChatModelId {
  const stored = localStorage.getItem(CHAT_MODEL_STORAGE_KEY);
  return resolveChatModel(stored ?? undefined);
}
