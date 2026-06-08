import { useContext } from "react";

import {
  ConversationFlowContext,
  type ConversationFlowContextValue,
} from "@/components/conversationFlowContext";

export function useConversationFlow(): ConversationFlowContextValue {
  const context = useContext(ConversationFlowContext);
  if (!context) {
    throw new Error(
      "useConversationFlow must be used within ConversationFlowProvider"
    );
  }
  return context;
}
