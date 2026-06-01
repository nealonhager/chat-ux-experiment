import { Copy, GitFork, Loader2, Speech } from "lucide-react";
import { type ReactNode, useEffect, useMemo } from "react";

import { usePanZoom } from "@/components/PanZoomContext";
import {
  getBubbleThreadSegments,
  getBubbleWorldRectsFromTree,
} from "@/lib/chatBubbleLayout";
import type { ConversationTree } from "@/lib/conversationTree";
import { getViewportWorldRect, WORLD_SIZE } from "@/lib/panZoom";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  parentId: string | null;
};

type ChatBubblesProps = {
  tree: ConversationTree;
  isSending?: boolean;
  thinkingParentId?: string | null;
  errorMessage?: string;
  speakingMessageId?: string | null;
  onFork?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  onSpeak?: (messageId: string, content: string) => void;
  onSelectMessage?: (messageId: string) => void;
};

function BubbleActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-200/80 hover:text-gray-600"
    >
      {children}
    </button>
  );
}

type PlacedBubbleProps = {
  role: ChatMessage["role"] | "thinking";
  content: string;
  messageId?: string;
  isActive?: boolean;
  isSpeaking?: boolean;
  onFork?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  onSpeak?: (messageId: string, content: string) => void;
  onSelect?: (messageId: string) => void;
  style: React.CSSProperties;
};

function PlacedChatBubble({
  role,
  content,
  messageId,
  isActive = false,
  isSpeaking = false,
  onFork,
  onCopy,
  onSpeak,
  onSelect,
  style,
}: PlacedBubbleProps) {
  const showActions =
    role === "assistant" && messageId && onFork && onCopy && onSpeak;

  function handleBubbleClick(): void {
    if (messageId && onSelect) {
      onSelect(messageId);
    }
  }

  return (
    <div
      data-no-pan
      data-chat-bubble
      role={messageId ? "button" : undefined}
      tabIndex={messageId && onSelect ? 0 : undefined}
      className={cn(
        "pointer-events-auto absolute rounded-lg border-2 px-4 py-3 text-sm font-medium transition-shadow",
        role === "user"
          ? "border-blue-300 bg-blue-50 text-blue-700"
          : "border-gray-300 bg-gray-100 text-gray-500",
        isActive && "border-blue-600 ring-2 ring-blue-600 ring-offset-2",
        messageId && onSelect && "cursor-pointer hover:shadow-md"
      )}
      style={style}
      onClick={messageId && onSelect ? handleBubbleClick : undefined}
      onKeyDown={
        messageId && onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleBubbleClick();
              }
            }
          : undefined
      }
    >
      <div>{content}</div>
      {showActions ? (
        <div
          className="mt-2 flex gap-0.5 border-t border-gray-300/70 pt-2"
          onClick={(event) => event.stopPropagation()}
        >
          <BubbleActionButton
            label="Set active — next message branches from here"
            onClick={() => onFork(messageId)}
          >
            <GitFork className="size-4 rotate-180" />
          </BubbleActionButton>
          <BubbleActionButton
            label="Copy message"
            onClick={() => onCopy(content)}
          >
            <Copy className="size-4" />
          </BubbleActionButton>
          <BubbleActionButton
            label="Speak message"
            onClick={() => onSpeak(messageId, content)}
          >
            {isSpeaking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Speech className="size-4" />
            )}
          </BubbleActionButton>
        </div>
      ) : null}
    </div>
  );
}

function ActiveNodeViewportSync({
  tree,
  thinkingParentId,
  isSending,
}: {
  tree: ConversationTree;
  thinkingParentId?: string | null;
  isSending: boolean;
}) {
  const { transform, viewportSize, panToWorldPoint } = usePanZoom();

  const bubbles = useMemo(
    () => getBubbleWorldRectsFromTree(tree, isSending, thinkingParentId),
    [tree, isSending, thinkingParentId]
  );

  useEffect(() => {
    if (!tree.activeNodeId) {
      return;
    }

    const activeBubble = bubbles.find(
      (bubble) => bubble.id === tree.activeNodeId
    );

    if (!activeBubble) {
      return;
    }

    const viewport = getViewportWorldRect(transform, viewportSize);

    const isVisible =
      activeBubble.x + activeBubble.width > viewport.x &&
      activeBubble.x < viewport.x + viewport.width &&
      activeBubble.y + activeBubble.height > viewport.y &&
      activeBubble.y < viewport.y + viewport.height;

    if (!isVisible) {
      panToWorldPoint(
        activeBubble.x + activeBubble.width / 2,
        activeBubble.y + activeBubble.height / 2
      );
    }
  }, [tree.activeNodeId, bubbles, transform, viewportSize, panToWorldPoint]);

  return null;
}

export function ChatBubbles({
  tree,
  isSending = false,
  thinkingParentId = null,
  errorMessage = "",
  speakingMessageId = null,
  onFork,
  onCopy,
  onSpeak,
  onSelectMessage,
}: ChatBubblesProps) {
  const bubbles = useMemo(
    () => getBubbleWorldRectsFromTree(tree, isSending, thinkingParentId),
    [tree, isSending, thinkingParentId]
  );

  const threadSegments = useMemo(
    () => getBubbleThreadSegments(bubbles),
    [bubbles]
  );

  const placedBubbles = useMemo(
    () => [...bubbles].sort((a, b) => a.y - b.y || a.x - b.x),
    [bubbles]
  );

  const hasMessages = placedBubbles.length > 0;

  return (
    <>
      <ActiveNodeViewportSync
        tree={tree}
        thinkingParentId={thinkingParentId}
        isSending={isSending}
      />
      <main
        className="pointer-events-none absolute left-0 top-0"
        style={{ width: WORLD_SIZE, height: WORLD_SIZE }}
      >
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0"
          width={WORLD_SIZE}
          height={WORLD_SIZE}
        >
          {threadSegments.map((segment, index) => (
            <line
              key={index}
              x1={segment.x1}
              y1={segment.y1}
              x2={segment.x2}
              y2={segment.y2}
              stroke="var(--color-slate-300)"
              strokeWidth={2}
            />
          ))}
        </svg>
        {hasMessages
          ? placedBubbles.map((bubble, index) => {
              if (bubble.role === "thinking") {
                return (
                  <PlacedChatBubble
                    key={bubble.id}
                    role="thinking"
                    content="Thinking..."
                    style={{
                      left: bubble.x,
                      top: bubble.y,
                      width: bubble.width,
                      minHeight: bubble.height,
                      zIndex: index + 1,
                    }}
                  />
                );
              }

              const message = tree.messages[bubble.id];

              if (!message) {
                return null;
              }

              return (
                <PlacedChatBubble
                  key={bubble.id}
                  role={message.role}
                  content={message.content}
                  messageId={message.id}
                  isActive={
                    message.role === "assistant"
                      ? tree.activeNodeId === message.id
                      : tree.activeNodeId === message.parentId
                  }
                  isSpeaking={speakingMessageId === message.id}
                  onFork={message.role === "assistant" ? onFork : undefined}
                  onCopy={message.role === "assistant" ? onCopy : undefined}
                  onSpeak={message.role === "assistant" ? onSpeak : undefined}
                  onSelect={onSelectMessage}
                  style={{
                    left: bubble.x,
                    top: bubble.y,
                    width: bubble.width,
                    minHeight: bubble.height,
                    zIndex: index + 1,
                  }}
                />
              );
            })
          : null}
        {errorMessage ? (
          <p className="pointer-events-auto absolute left-1/2 top-8 w-full max-w-md -translate-x-1/2 px-4 text-center text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </main>
    </>
  );
}
