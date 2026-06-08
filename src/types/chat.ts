import type { ChatModelId } from "@/lib/chatModels";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  parentId: string | null;
  model?: string;
  createdAt?: string;
};

export type ComposerProps = {
  value: string;
  disabled?: boolean;
  isRecording?: boolean;
  isTranscribing?: boolean;
  placeholder?: string;
  model: ChatModelId;
  onChange: (value: string) => void;
  onModelChange: (model: ChatModelId) => void;
  onSend: (text: string) => void;
  onToggleRecording: () => void;
};
