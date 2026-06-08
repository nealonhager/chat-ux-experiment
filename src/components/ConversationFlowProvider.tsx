import { type ReactNode } from "react";

import {
  ConversationFlowContext,
  type ConversationFlowContextValue,
} from "@/components/conversationFlowContext";

type ConversationFlowProviderProps = ConversationFlowContextValue & {
  children: ReactNode;
};

export function ConversationFlowProvider({
  children,
  composer,
  onSelectMessage,
  regenerate,
}: ConversationFlowProviderProps) {
  return (
    <ConversationFlowContext.Provider
      value={{ composer, onSelectMessage, regenerate }}
    >
      {children}
    </ConversationFlowContext.Provider>
  );
}
