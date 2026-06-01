import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Speech } from "lucide-react";

import { TextShimmer } from "@/components/loading-ui/text-shimmer";
import { Button } from "@/components/ui/button";
import { usePanZoom } from "@/components/PanZoomContext";
import {
  getBubbleThreadSegments,
  getBubbleWorldRectsFromTree,
} from "@/lib/chatBubbleLayout";
import type { ConversationTree } from "@/lib/conversationTree";
import {
  getViewportWorldRect,
  MINIMAP_SIZE,
  minimapPointToWorld,
  WORLD_SIZE,
  worldRectToMinimap,
} from "@/lib/panZoom";
import { cn } from "@/lib/utils";

type PanZoomMinimapProps = {
  tree?: ConversationTree;
  isSending?: boolean;
  thinkingParentId?: string | null;
  speechEnabled?: boolean;
  isSpeechLoading?: boolean;
  isSpeaking?: boolean;
  onToggleSpeech?: () => void;
  hasMessages?: boolean;
  onClearConversation?: () => void;
  className?: string;
};

function bubbleClassName(role: "user" | "assistant" | "thinking"): string {
  switch (role) {
    case "user":
      return "bg-black/90";
    case "assistant":
    case "thinking":
      return "bg-white/90";
  }
}

type SpeechToggleButtonProps = {
  speechEnabled: boolean;
  isSpeechLoading: boolean;
  isSpeaking: boolean;
  onToggleSpeech: () => void;
};

function SpeechToggleButton({
  speechEnabled,
  isSpeechLoading,
  isSpeaking,
  onToggleSpeech,
}: SpeechToggleButtonProps) {
  const speechLabelKey = isSpeechLoading
    ? "loading"
    : isSpeaking
      ? "speaking"
      : null;
  const speechLabelText = isSpeechLoading
    ? "Loading"
    : isSpeaking
      ? "Speaking"
      : null;

  return (
    <motion.button
      layout
      type="button"
      data-no-pan
      className={cn(
        "inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-lg px-2 py-2 text-sm font-medium transition-colors",
        speechEnabled
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      transition={{ layout: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } }}
      onClick={onToggleSpeech}
      aria-label={
        isSpeechLoading
          ? "Loading spoken response"
          : isSpeaking
            ? "Agent is speaking"
            : speechEnabled
              ? "Disable spoken responses"
              : "Enable spoken responses"
      }
      aria-pressed={speechEnabled}
    >
      <motion.span layout="position" className="inline-flex shrink-0">
        <Speech className="size-5" />
      </motion.span>
      <AnimatePresence mode="popLayout" initial={false}>
        {speechLabelKey && speechLabelText ? (
          <motion.span
            key={speechLabelKey}
            layout
            initial={{ opacity: 0, width: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, width: "auto", filter: "blur(0px)" }}
            exit={{ opacity: 0, width: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="inline-flex overflow-hidden whitespace-nowrap"
          >
            <TextShimmer as="span" duration={1.5}>
              {speechLabelText}
            </TextShimmer>
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.button>
  );
}

export function PanZoomMinimap({
  tree,
  isSending = false,
  thinkingParentId = null,
  speechEnabled = false,
  isSpeechLoading = false,
  isSpeaking = false,
  onToggleSpeech,
  hasMessages = false,
  onClearConversation,
  className,
}: PanZoomMinimapProps) {
  const { transform, viewportSize, panToWorldPoint } = usePanZoom();
  const minimapRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const bubbles = useMemo(() => {
    if (!tree) {
      return [];
    }

    return getBubbleWorldRectsFromTree(tree, isSending, thinkingParentId).map(
      (bubble) => ({
        ...bubble,
        minimap: worldRectToMinimap(bubble),
      })
    );
  }, [tree, isSending, thinkingParentId]);

  const viewportRect = worldRectToMinimap(
    getViewportWorldRect(transform, viewportSize)
  );

  const threadSegments = getBubbleThreadSegments(bubbles).map((segment) => ({
    x1: segment.x1 * (MINIMAP_SIZE / WORLD_SIZE),
    y1: segment.y1 * (MINIMAP_SIZE / WORLD_SIZE),
    x2: segment.x2 * (MINIMAP_SIZE / WORLD_SIZE),
    y2: segment.y2 * (MINIMAP_SIZE / WORLD_SIZE),
  }));

  const navigateFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = minimapRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const worldPoint = minimapPointToWorld(localX, localY);
      panToWorldPoint(worldPoint.x, worldPoint.y);
    },
    [panToWorldPoint]
  );

  useEffect(() => {
    function handlePointerMove(event: PointerEvent): void {
      if (!isDraggingRef.current) {
        return;
      }

      navigateFromClientPoint(event.clientX, event.clientY);
    }

    function handlePointerUp(): void {
      if (!isDraggingRef.current) {
        return;
      }

      isDraggingRef.current = false;
      setIsDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [navigateFromClientPoint]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    isDraggingRef.current = true;
    setIsDragging(true);
    navigateFromClientPoint(event.clientX, event.clientY);
  }

  if (!tree) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-auto fixed left-4 top-4 z-40 flex flex-col gap-2 rounded-xl border bg-card/95 p-2 backdrop-blur",
        className
      )}
    >
      <div
        ref={minimapRef}
        role="img"
        aria-label="Canvas minimap. Click or drag to navigate."
        className={cn(
          "relative cursor-crosshair overflow-hidden rounded-md border bg-gray-50",
          isDragging && "ring-2 ring-primary/40"
        )}
        style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE }}
        onPointerDown={handlePointerDown}
      >
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0"
          width={MINIMAP_SIZE}
          height={MINIMAP_SIZE}
        >
          {threadSegments.map((segment, index) => (
            <line
              key={index}
              x1={segment.x1}
              y1={segment.y1}
              x2={segment.x2}
              y2={segment.y2}
              stroke="var(--color-slate-300)"
              strokeWidth={1.5}
            />
          ))}
        </svg>
        {bubbles.map((bubble) => (
          <div
            key={bubble.id}
            aria-hidden
            className={cn(
              "absolute rounded-[2px]",
              bubbleClassName(bubble.role)
            )}
            style={{
              left: bubble.minimap.x,
              top: bubble.minimap.y,
              width: Math.max(bubble.minimap.width, 2),
              height: Math.max(bubble.minimap.height, 2),
            }}
          />
        ))}
        <div
          aria-hidden
          className="absolute rounded-sm border-2 border-primary bg-primary/15"
          style={{
            left: viewportRect.x,
            top: viewportRect.y,
            width: Math.max(viewportRect.width, 4),
            height: Math.max(viewportRect.height, 4),
          }}
        />
      </div>
      {onToggleSpeech ? (
        <SpeechToggleButton
          speechEnabled={speechEnabled}
          isSpeechLoading={isSpeechLoading}
          isSpeaking={isSpeaking}
          onToggleSpeech={onToggleSpeech}
        />
      ) : null}
      {onClearConversation ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-no-pan
          disabled={!hasMessages}
          className="w-full text-muted-foreground"
          onClick={onClearConversation}
        >
          Clear conversation
        </Button>
      ) : null}
    </div>
  );
}
