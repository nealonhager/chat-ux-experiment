import { createContext } from "react";

import type { ChatModelId } from "@/lib/chatModels";
import type { ComposerProps } from "@/types/chat";

export type RegenerateProps = {
  disabled?: boolean;
  model: ChatModelId;
  onModelChange: (model: ChatModelId) => void;
  onRegenerate: (messageId: string) => void;
};

export type ConversationFlowContextValue = {
  composer: ComposerProps | null;
  onSelectMessage?: (messageId: string) => void;
  regenerate: RegenerateProps | null;
};

export const ConversationFlowContext =
  createContext<ConversationFlowContextValue | null>(null);
