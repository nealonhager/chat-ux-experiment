import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  PanZoomContext,
  type PanZoomContextValue,
} from "@/components/PanZoomContext";
import type { ConversationTree } from "@/lib/conversationTree";
import { PanZoomMinimap } from "@/components/PanZoomMinimap";
import {
  clampTransform,
  getCenteredPan,
  panToWorldCenter,
  toPanStyle,
  toZoomStyle,
  type PanZoomTransform,
  type ViewportSize,
  WORLD_SIZE,
  zoomAtPoint,
} from "@/lib/panZoom";
import type { SpeechStyleId, TtsModelId } from "@/lib/speechSettings";
import type { SpeechVoiceId } from "@/lib/speechVoices";
import { cn } from "@/lib/utils";
import { isPanZoomInteractiveTarget } from "@/lib/panZoomInteraction";

type PanZoomLayerProps = {
  children: ReactNode;
  className?: string;
  showMinimap?: boolean;
  tree?: ConversationTree;
  minimapIsSending?: boolean;
  thinkingParentId?: string | null;
  speechEnabled?: boolean;
  speechVoice?: SpeechVoiceId;
  ttsModel?: TtsModelId;
  speechStyle?: SpeechStyleId;
  speechSpeed?: number;
  isSpeechLoading?: boolean;
  isSpeaking?: boolean;
  onToggleSpeech?: () => void;
  onSpeechVoiceChange?: (voice: SpeechVoiceId) => void;
  onTtsModelChange?: (model: TtsModelId) => void;
  onSpeechStyleChange?: (style: SpeechStyleId) => void;
  onSpeechSpeedChange?: (speed: number) => void;
  hasMessages?: boolean;
  onClearConversation?: () => void;
};

function createInitialTransform(): PanZoomTransform {
  return { ...getCenteredPan(1), scale: 1 };
}

function getViewportSize(): ViewportSize {
  return { width: window.innerWidth, height: window.innerHeight };
}

export function PanZoomLayer({
  children,
  className,
  showMinimap = true,
  tree,
  minimapIsSending = false,
  thinkingParentId = null,
  speechEnabled = false,
  speechVoice,
  ttsModel,
  speechStyle,
  speechSpeed,
  isSpeechLoading = false,
  isSpeaking = false,
  onToggleSpeech,
  onSpeechVoiceChange,
  onTtsModelChange,
  onSpeechStyleChange,
  onSpeechSpeedChange,
  hasMessages = false,
  onClearConversation,
}: PanZoomLayerProps) {
  const [transform, setTransform] = useState<PanZoomTransform>(
    createInitialTransform
  );
  const [viewportSize, setViewportSize] =
    useState<ViewportSize>(getViewportSize);
  const [isPanning, setIsPanning] = useState(false);
  const [interactionRevision, setInteractionRevision] = useState(0);

  const transformRef = useRef(transform);
  const isPanningRef = useRef(false);
  const captureTargetRef = useRef<HTMLElement | null>(null);
  const panStartRef = useRef({
    pointerX: 0,
    pointerY: 0,
    transformX: 0,
    transformY: 0,
  });

  transformRef.current = transform;

  const bumpInteractionRevision = useCallback(() => {
    setInteractionRevision((current) => current + 1);
  }, []);

  const updateTransform = useCallback(
    (next: PanZoomTransform, viewport = getViewportSize()) => {
      const clamped = clampTransform(next, viewport);
      transformRef.current = clamped;
      setTransform(clamped);
    },
    []
  );

  const panToWorldPoint = useCallback(
    (worldX: number, worldY: number) => {
      updateTransform({
        ...transformRef.current,
        ...panToWorldCenter(
          worldX,
          worldY,
          transformRef.current.scale,
          viewportSize
        ),
      });
    },
    [updateTransform, viewportSize]
  );

  const contextValue = useMemo<PanZoomContextValue>(
    () => ({
      transform,
      viewportSize,
      updateTransform: (next) => updateTransform(next),
      panToWorldPoint,
      interactionRevision,
    }),
    [
      transform,
      viewportSize,
      updateTransform,
      panToWorldPoint,
      interactionRevision,
    ]
  );

  useEffect(() => {
    function handleResize(): void {
      const viewport = getViewportSize();
      setViewportSize(viewport);
      updateTransform(transformRef.current, viewport);
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [updateTransform]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent): void {
      if (!isPanningRef.current) {
        return;
      }

      const { pointerX, pointerY, transformX, transformY } =
        panStartRef.current;
      updateTransform({
        ...transformRef.current,
        x: transformX + (event.clientX - pointerX),
        y: transformY + (event.clientY - pointerY),
      });
    }

    function handlePointerUp(event: PointerEvent): void {
      if (!isPanningRef.current) {
        return;
      }

      isPanningRef.current = false;
      setIsPanning(false);
      captureTargetRef.current?.releasePointerCapture(event.pointerId);
      captureTargetRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [updateTransform]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) {
      return;
    }

    if (isPanZoomInteractiveTarget(event.target)) {
      return;
    }

    event.preventDefault();
    bumpInteractionRevision();
    isPanningRef.current = true;
    setIsPanning(true);
    panStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      transformX: transformRef.current.x,
      transformY: transformRef.current.y,
    };
    captureTargetRef.current = event.currentTarget;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>): void {
    if (isPanZoomInteractiveTarget(event.target)) {
      return;
    }

    event.preventDefault();
    bumpInteractionRevision();

    const zoomIntensity = event.ctrlKey ? 0.01 : 0.002;
    const deltaScale = Math.exp(-event.deltaY * zoomIntensity);

    updateTransform(
      zoomAtPoint(
        transformRef.current,
        event.clientX,
        event.clientY,
        deltaScale
      )
    );
  }

  return (
    <PanZoomContext.Provider value={contextValue}>
      <div
        className={cn(
          "absolute inset-0 touch-none select-none overflow-hidden",
          isPanning ? "cursor-grabbing" : "cursor-grab",
          className
        )}
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
      >
        <div className="origin-top-left" style={toPanStyle(transform)}>
          <div
            className="relative origin-top-left bg-gray-50"
            style={{
              ...toZoomStyle(transform),
              width: WORLD_SIZE,
              height: WORLD_SIZE,
            }}
          >
            {children}
          </div>
        </div>
      </div>

      {showMinimap ? (
        <PanZoomMinimap
          tree={tree}
          isSending={minimapIsSending}
          thinkingParentId={thinkingParentId}
          speechEnabled={speechEnabled}
          speechVoice={speechVoice}
          ttsModel={ttsModel}
          speechStyle={speechStyle}
          speechSpeed={speechSpeed}
          isSpeechLoading={isSpeechLoading}
          isSpeaking={isSpeaking}
          onToggleSpeech={onToggleSpeech}
          onSpeechVoiceChange={onSpeechVoiceChange}
          onTtsModelChange={onTtsModelChange}
          onSpeechStyleChange={onSpeechStyleChange}
          onSpeechSpeedChange={onSpeechSpeedChange}
          hasMessages={hasMessages}
          onClearConversation={onClearConversation}
        />
      ) : null}
    </PanZoomContext.Provider>
  );
}
