import { AnimatePresence, motion } from "motion/react";
import { type NodeProps } from "@xyflow/react";

import { ChatInputBar } from "@/components/ChatInputBar";
import { StructuredReply } from "@/components/StructuredReply";
import { BubbleHandles } from "@/components/nodes/BubbleHandles";
import { AssistantActionRow } from "@/components/nodes/AssistantActionRow";
import { useConversationFlow } from "@/components/useConversationFlow";
import type { ChatBubbleNodeData } from "@/lib/conversationFlowLayout";
import { formatMessageTimestamp } from "@/lib/formatMessageTimestamp";
import { cn } from "@/lib/utils";

const COMPOSER_MOTION = {
  duration: 0.24,
  ease: [0.4, 0, 0.2, 1] as const,
};

function AnimatedEmbeddedComposer({
  composer,
  messageId,
}: {
  composer: NonNullable<ReturnType<typeof useConversationFlow>["composer"]>;
  messageId: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={COMPOSER_MOTION}
      className="overflow-hidden"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="border-t border-black/10 pt-3">
        <ChatInputBar size="mini" showModelSelect={false} {...composer} />
        <AssistantActionRow messageId={messageId} showTopBorder={false} />
      </div>
    </motion.div>
  );
}

export function ChatBubbleNode({ data }: NodeProps) {
  const nodeData = data as ChatBubbleNodeData;
  const { composer, onSelectMessage } = useConversationFlow();
  const {
    role,
    content,
    messageId,
    model,
    createdAt,
    isActive,
    showComposer,
    width,
    minHeight,
  } = nodeData;

  const timestampLabel = createdAt ? formatMessageTimestamp(createdAt) : null;
  const showFooter =
    Boolean(timestampLabel) || (role === "assistant" && messageId && model);
  const isSelectable =
    role === "assistant" && Boolean(messageId && onSelectMessage);

  function handleBubbleClick(): void {
    if (messageId && onSelectMessage) {
      onSelectMessage(messageId);
    }
  }

  return (
    <div
      className={cn(
        "nodrag nopan relative flex flex-col gap-3 rounded-lg px-4 py-3 text-sm shadow-sm",
        role === "user" ? "bg-black text-white" : "bg-white text-gray-900",
        role === "thinking" && "text-gray-500",
        isSelectable && "cursor-pointer",
        isActive && "ring-2 ring-primary ring-offset-2 ring-offset-gray-50"
      )}
      style={{ width, minHeight }}
      role={isSelectable ? "button" : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      onClick={isSelectable ? handleBubbleClick : undefined}
      onKeyDown={
        isSelectable
          ? (event) => {
              if (event.target !== event.currentTarget) {
                return;
              }
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleBubbleClick();
              }
            }
          : undefined
      }
    >
      <BubbleHandles />
      {role === "assistant" ? (
        <StructuredReply content={content} />
      ) : (
        <div className="whitespace-pre-wrap break-words">{content}</div>
      )}
      <AnimatePresence initial={false}>
        {showComposer && composer && messageId ? (
          <AnimatedEmbeddedComposer composer={composer} messageId={messageId} />
        ) : null}
      </AnimatePresence>
      {role === "assistant" && messageId && !showComposer ? (
        <AssistantActionRow messageId={messageId} />
      ) : null}
      {showFooter ? (
        <div className="flex items-center justify-between gap-2">
          {timestampLabel ? (
            <time
              dateTime={createdAt}
              className={cn(
                "shrink-0 text-xs font-normal tabular-nums",
                role === "user" ? "text-white/60" : "text-gray-400"
              )}
            >
              {timestampLabel}
            </time>
          ) : (
            <span />
          )}
          {role === "assistant" && model ? (
            <span className="truncate text-xs font-normal text-gray-400">
              {model}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
