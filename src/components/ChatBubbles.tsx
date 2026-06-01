import { Copy, GitFork, Loader2, Speech } from "lucide-react";
import { type ReactNode, useEffect, useMemo } from "react";

import { ChatInputBar } from "@/components/ChatInputBar";
import { usePanZoom } from "@/components/PanZoomContext";
import {
  COMPOSER_ROOT_ANCHOR,
  type ComposerAnchorId,
  getBubbleThreadSegments,
  getCanvasLayoutFromTree,
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

export type ComposerProps = {
  value: string;
  disabled?: boolean;
  isRecording?: boolean;
  isTranscribing?: boolean;
  speechEnabled?: boolean;
  isSpeaking?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  onToggleRecording: () => void;
  onToggleSpeech: () => void;
};

type ChatBubblesProps = {
  tree: ConversationTree;
  composerAnchorId: ComposerAnchorId | null;
  composer: ComposerProps | null;
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
  showComposer?: boolean;
  composer?: ComposerProps;
  onFork?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  onSpeak?: (messageId: string, content: string) => void;
  onSelect?: (messageId: string) => void;
  style: React.CSSProperties;
};

function EmbeddedComposer({ composer }: { composer: ComposerProps }) {
  return (
    <div
      className="mt-2 border-t border-gray-300/70 pt-2"
      onClick={(event) => event.stopPropagation()}
    >
      <ChatInputBar size="mini" {...composer} />
    </div>
  );
}

function PlacedChatBubble({
  role,
  content,
  messageId,
  isActive = false,
  isSpeaking = false,
  showComposer = false,
  composer,
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
      role={messageId && !showComposer ? "button" : undefined}
      tabIndex={messageId && onSelect && !showComposer ? 0 : undefined}
      className={cn(
        "pointer-events-auto absolute rounded-lg px-4 py-3 text-sm font-medium transition-shadow",
        isActive ? "border-4" : "border-2",
        role === "user"
          ? "border-blue-300 bg-blue-50 text-blue-700"
          : "border-gray-300 bg-gray-100 text-gray-500",
        messageId &&
          onSelect &&
          !showComposer &&
          "cursor-pointer hover:shadow-md"
      )}
      style={style}
      onClick={
        messageId && onSelect && !showComposer ? handleBubbleClick : undefined
      }
      onKeyDown={
        messageId && onSelect && !showComposer
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
      {showComposer && composer ? (
        <EmbeddedComposer composer={composer} />
      ) : null}
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

function PlacedRootComposer({
  composer,
  style,
}: {
  composer: ComposerProps;
  style: React.CSSProperties;
}) {
  return (
    <div
      data-no-pan
      data-chat-bubble
      className="pointer-events-auto absolute rounded-lg border-2 border-blue-300 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700"
      style={style}
    >
      <ChatInputBar size="mini" {...composer} />
    </div>
  );
}

function ActiveNodeViewportSync({
  tree,
  thinkingParentId,
  isSending,
  composerAnchorId,
}: {
  tree: ConversationTree;
  thinkingParentId?: string | null;
  isSending: boolean;
  composerAnchorId: ComposerAnchorId | null;
}) {
  const { transform, viewportSize, panToWorldPoint } = usePanZoom();

  const layout = useMemo(
    () =>
      getCanvasLayoutFromTree(tree, {
        isSending,
        thinkingParentId,
        composerAnchorId,
      }),
    [tree, isSending, thinkingParentId, composerAnchorId]
  );

  useEffect(() => {
    const focusRect =
      composerAnchorId === COMPOSER_ROOT_ANCHOR
        ? layout.composerSlot
        : composerAnchorId
          ? layout.bubbles.find((bubble) => bubble.id === composerAnchorId)
          : null;

    if (!focusRect) {
      return;
    }

    const viewport = getViewportWorldRect(transform, viewportSize);

    const isVisible =
      focusRect.x + focusRect.width > viewport.x &&
      focusRect.x < viewport.x + viewport.width &&
      focusRect.y + focusRect.height > viewport.y &&
      focusRect.y < viewport.y + viewport.height;

    if (!isVisible) {
      panToWorldPoint(
        focusRect.x + focusRect.width / 2,
        focusRect.y + focusRect.height / 2
      );
    }
  }, [
    composerAnchorId,
    layout.bubbles,
    layout.composerSlot,
    transform,
    viewportSize,
    panToWorldPoint,
  ]);

  return null;
}

export function ChatBubbles({
  tree,
  composerAnchorId,
  composer,
  isSending = false,
  thinkingParentId = null,
  errorMessage = "",
  speakingMessageId = null,
  onFork,
  onCopy,
  onSpeak,
  onSelectMessage,
}: ChatBubblesProps) {
  const layout = useMemo(
    () =>
      getCanvasLayoutFromTree(tree, {
        isSending,
        thinkingParentId,
        composerAnchorId,
      }),
    [tree, isSending, thinkingParentId, composerAnchorId]
  );

  const { bubbles, composerSlot } = layout;

  const threadSegments = useMemo(
    () => getBubbleThreadSegments(bubbles),
    [bubbles]
  );

  const placedBubbles = useMemo(
    () => [...bubbles].sort((a, b) => a.y - b.y || a.x - b.x),
    [bubbles]
  );

  const hasMessages = placedBubbles.length > 0;
  const showRootComposer =
    composerAnchorId === COMPOSER_ROOT_ANCHOR && composer && composerSlot;

  return (
    <>
      <ActiveNodeViewportSync
        tree={tree}
        thinkingParentId={thinkingParentId}
        isSending={isSending}
        composerAnchorId={composerAnchorId}
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

              const embedComposer =
                message.role === "assistant" &&
                composerAnchorId === message.id &&
                composer !== null;

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
                  showComposer={embedComposer}
                  composer={embedComposer ? composer : undefined}
                  onFork={message.role === "assistant" ? onFork : undefined}
                  onCopy={message.role === "assistant" ? onCopy : undefined}
                  onSpeak={message.role === "assistant" ? onSpeak : undefined}
                  onSelect={
                    message.role === "assistant" ? onSelectMessage : undefined
                  }
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
        {showRootComposer ? (
          <PlacedRootComposer
            composer={composer}
            style={{
              left: composerSlot.x,
              top: composerSlot.y,
              width: composerSlot.width,
              minHeight: composerSlot.height,
              zIndex: placedBubbles.length + 1,
            }}
          />
        ) : null}
        {errorMessage ? (
          <p className="pointer-events-auto absolute left-1/2 top-8 w-full max-w-md -translate-x-1/2 px-4 text-center text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </main>
    </>
  );
}
