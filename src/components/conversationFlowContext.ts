import { createContext } from "react";

import type { ComposerProps } from "@/types/chat";

export type ConversationFlowContextValue = {
  composer: ComposerProps | null;
  onSelectMessage?: (messageId: string) => void;
};

export const ConversationFlowContext =
  createContext<ConversationFlowContextValue | null>(null);
