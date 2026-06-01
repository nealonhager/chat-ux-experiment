import { Copy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useMemo, useRef } from "react";

import { ChatInputBar } from "@/components/ChatInputBar";
import { usePanZoom } from "@/components/PanZoomContext";
import {
  COMPOSER_ROOT_ANCHOR,
  type ComposerAnchorId,
  getBubbleThreadSegments,
  getCanvasLayoutFromTree,
} from "@/lib/chatBubbleLayout";
import { formatMessageTimestamp } from "@/lib/formatMessageTimestamp";
import type { ConversationTree } from "@/lib/conversationTree";
import { isComposerInteractionTarget } from "@/lib/panZoomInteraction";
import { getViewportWorldRect, WORLD_SIZE } from "@/lib/panZoom";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  parentId: string | null;
  model?: string;
  createdAt?: string;
};

import type { ChatModelId } from "@/lib/chatModels";

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

type ChatBubblesProps = {
  tree: ConversationTree;
  composerAnchorId: ComposerAnchorId | null;
  composer: ComposerProps | null;
  isSending?: boolean;
  thinkingParentId?: string | null;
  errorMessage?: string;
  onCopy?: (content: string) => void;
  onSelectMessage?: (messageId: string) => void;
};

const COMPOSER_MOTION = {
  duration: 0.24,
  ease: [0.4, 0, 0.2, 1] as const,
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
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className="cursor-pointer rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-200/80 hover:text-gray-600"
    >
      {children}
    </button>
  );
}

type PlacedBubbleProps = {
  role: ChatMessage["role"] | "thinking";
  content: string;
  model?: string;
  createdAt?: string;
  messageId?: string;
  showComposer?: boolean;
  composer?: ComposerProps;
  onCopy?: (content: string) => void;
  onSelect?: (messageId: string) => void;
  style: React.CSSProperties;
};

function AnimatedEmbeddedComposer({ composer }: { composer: ComposerProps }) {
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
        <ChatInputBar size="mini" {...composer} />
      </div>
    </motion.div>
  );
}

function PlacedChatBubble({
  role,
  content,
  model,
  createdAt,
  messageId,
  showComposer = false,
  composer,
  onCopy,
  onSelect,
  style,
}: PlacedBubbleProps) {
  const timestampLabel = createdAt ? formatMessageTimestamp(createdAt) : null;
  const showFooter =
    Boolean(timestampLabel) ||
    (role === "assistant" && messageId && (onCopy || model));

  function handleBubbleClick(event: React.MouseEvent<HTMLDivElement>): void {
    if (isComposerInteractionTarget(event.target)) {
      return;
    }

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
        "pointer-events-auto absolute flex flex-col gap-3 rounded-lg px-4 py-3 text-sm",
        role === "user" ? "bg-black text-white" : "bg-white text-gray-900",
        role === "thinking" && "text-gray-500",
        messageId && onSelect && "cursor-pointer"
      )}
      style={style}
      onClick={messageId && onSelect ? handleBubbleClick : undefined}
      onKeyDown={
        messageId && onSelect
          ? (event) => {
              const target = event.target;
              if (
                target instanceof HTMLElement &&
                target !== event.currentTarget &&
                isComposerInteractionTarget(target)
              ) {
                return;
              }
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (messageId) {
                  onSelect(messageId);
                }
              }
            }
          : undefined
      }
    >
      <div>{content}</div>
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
          {role === "assistant" && (onCopy || model) ? (
            <div className="flex min-w-0 items-center gap-0.5">
              {onCopy ? (
                <BubbleActionButton
                  label="Copy message"
                  onClick={() => onCopy(content)}
                >
                  <Copy className="size-4" />
                </BubbleActionButton>
              ) : null}
              {model ? (
                <span className="truncate text-xs font-normal text-gray-400">
                  {model}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <AnimatePresence initial={false}>
        {showComposer && composer ? (
          <AnimatedEmbeddedComposer composer={composer} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function PlacedRootComposer({ composer }: { composer: ComposerProps }) {
  return (
    <div data-no-pan data-chat-bubble>
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
  const prevComposerAnchorIdRef = useRef(composerAnchorId);

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
    const anchorChanged = prevComposerAnchorIdRef.current !== composerAnchorId;
    prevComposerAnchorIdRef.current = composerAnchorId;

    if (!anchorChanged || composerAnchorId === null) {
      return;
    }

    const focusRect =
      composerAnchorId === COMPOSER_ROOT_ANCHOR
        ? layout.composerSlot
        : layout.bubbles.find((bubble) => bubble.id === composerAnchorId);

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
  onCopy,
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
                  model={
                    message.role === "assistant" ? message.model : undefined
                  }
                  createdAt={message.createdAt}
                  messageId={message.id}
                  showComposer={embedComposer}
                  composer={embedComposer ? composer : undefined}
                  onCopy={message.role === "assistant" ? onCopy : undefined}
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
        <AnimatePresence initial={false}>
          {showRootComposer ? (
            <motion.div
              key="root-composer"
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={COMPOSER_MOTION}
              className="pointer-events-auto absolute"
              style={{
                left: composerSlot!.x,
                top: composerSlot!.y,
                width: composerSlot!.width,
                minHeight: composerSlot!.height,
                zIndex: placedBubbles.length + 1,
              }}
            >
              <PlacedRootComposer composer={composer!} />
            </motion.div>
          ) : null}
        </AnimatePresence>
        {errorMessage ? (
          <p className="pointer-events-auto absolute left-1/2 top-8 w-full max-w-md -translate-x-1/2 px-4 text-center text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </main>
    </>
  );
}
