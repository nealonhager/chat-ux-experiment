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
}: ConversationFlowProviderProps) {
  return (
    <ConversationFlowContext.Provider value={{ composer, onSelectMessage }}>
      {children}
    </ConversationFlowContext.Provider>
  );
}
