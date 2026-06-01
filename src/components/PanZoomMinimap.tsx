import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Speech } from "lucide-react";

import { TextShimmer } from "@/components/loading-ui/text-shimmer";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DEFAULT_SPEECH_SPEED,
  DEFAULT_SPEECH_STYLE,
  DEFAULT_TTS_MODEL,
  SPEECH_SPEED_MAX,
  SPEECH_SPEED_MIN,
  SPEECH_SPEED_STEP,
  SPEECH_STYLES,
  SPEECH_STYLE_ITEMS,
  TTS_MODELS,
  TTS_MODEL_ITEMS,
  ttsModelSupportsInstructions,
  type SpeechStyleId,
  type TtsModelId,
} from "@/lib/speechSettings";
import {
  DEFAULT_SPEECH_VOICE,
  SPEECH_VOICE_ITEMS,
  SPEECH_VOICES,
  type SpeechVoiceId,
} from "@/lib/speechVoices";
import { cn } from "@/lib/utils";

type PanZoomMinimapProps = {
  tree?: ConversationTree;
  isSending?: boolean;
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

type SpeechVoiceSelectProps = {
  voice: SpeechVoiceId;
  onVoiceChange: (voice: SpeechVoiceId) => void;
};

function SpeechVoiceSelect({ voice, onVoiceChange }: SpeechVoiceSelectProps) {
  function handleVoiceChange(nextVoice: string | null): void {
    if (nextVoice && SPEECH_VOICES.some((entry) => entry.id === nextVoice)) {
      onVoiceChange(nextVoice as SpeechVoiceId);
    }
  }

  return (
    <MinimapSelect
      ariaLabel="Speaker voice"
      items={SPEECH_VOICE_ITEMS}
      options={SPEECH_VOICES}
      value={voice}
      onValueChange={handleVoiceChange}
    />
  );
}

type SpeechTtsModelSelectProps = {
  model: TtsModelId;
  onModelChange: (model: TtsModelId) => void;
};

function SpeechTtsModelSelect({
  model,
  onModelChange,
}: SpeechTtsModelSelectProps) {
  function handleModelChange(nextModel: string | null): void {
    if (nextModel && TTS_MODELS.some((entry) => entry.id === nextModel)) {
      onModelChange(nextModel as TtsModelId);
    }
  }

  return (
    <MinimapSelect
      ariaLabel="Text-to-speech model"
      items={TTS_MODEL_ITEMS}
      options={TTS_MODELS}
      value={model}
      onValueChange={handleModelChange}
    />
  );
}

type SpeechStyleSelectProps = {
  model: TtsModelId;
  style: SpeechStyleId;
  onStyleChange: (style: SpeechStyleId) => void;
};

function SpeechStyleSelect({
  model,
  style,
  onStyleChange,
}: SpeechStyleSelectProps) {
  const stylesSupported = ttsModelSupportsInstructions(model);

  function handleStyleChange(nextStyle: string | null): void {
    if (nextStyle && SPEECH_STYLES.some((entry) => entry.id === nextStyle)) {
      onStyleChange(nextStyle as SpeechStyleId);
    }
  }

  return (
    <MinimapSelect
      ariaLabel="Speech style"
      disabled={!stylesSupported}
      items={SPEECH_STYLE_ITEMS}
      options={SPEECH_STYLES}
      value={style}
      onValueChange={handleStyleChange}
    />
  );
}

type SpeechSpeedControlProps = {
  speed: number;
  onSpeedChange: (speed: number) => void;
};

function SpeechSpeedControl({ speed, onSpeedChange }: SpeechSpeedControlProps) {
  return (
    <div data-no-pan className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <label htmlFor="speech-speed">Speed</label>
        <span className="tabular-nums">{speed.toFixed(2)}×</span>
      </div>
      <input
        id="speech-speed"
        type="range"
        min={SPEECH_SPEED_MIN}
        max={SPEECH_SPEED_MAX}
        step={SPEECH_SPEED_STEP}
        value={speed}
        onChange={(event) =>
          onSpeedChange(Number.parseFloat(event.target.value))
        }
        className="h-1.5 w-full cursor-pointer accent-primary"
        aria-label="Speech speed"
      />
    </div>
  );
}

type MinimapSelectOption = { id: string; label: string };

type MinimapSelectProps<T extends string> = {
  ariaLabel: string;
  disabled?: boolean;
  items: Array<{ value: T; label: string }>;
  options: readonly MinimapSelectOption[];
  value: T;
  onValueChange: (value: string | null) => void;
};

function MinimapSelect<T extends string>({
  ariaLabel,
  disabled = false,
  items,
  options,
  value,
  onValueChange,
}: MinimapSelectProps<T>) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        size="sm"
        data-no-pan
        className="w-full cursor-pointer text-muted-foreground disabled:opacity-50"
        aria-label={ariaLabel}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className="max-h-72 w-[var(--anchor-width)] min-w-[var(--anchor-width)]"
      >
        {options.map((entry) => (
          <SelectItem key={entry.id} value={entry.id}>
            {entry.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function PanZoomMinimap({
  tree,
  isSending = false,
  thinkingParentId = null,
  speechEnabled = false,
  speechVoice = DEFAULT_SPEECH_VOICE,
  ttsModel = DEFAULT_TTS_MODEL,
  speechStyle = DEFAULT_SPEECH_STYLE,
  speechSpeed = DEFAULT_SPEECH_SPEED,
  isSpeechLoading = false,
  isSpeaking = false,
  onToggleSpeech,
  onSpeechVoiceChange,
  onTtsModelChange,
  onSpeechStyleChange,
  onSpeechSpeedChange,
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
      {onSpeechVoiceChange ||
      onTtsModelChange ||
      onSpeechStyleChange ||
      onSpeechSpeedChange ? (
        <div className="flex flex-col gap-2">
          {onSpeechVoiceChange ? (
            <SpeechVoiceSelect
              voice={speechVoice}
              onVoiceChange={onSpeechVoiceChange}
            />
          ) : null}
          {onTtsModelChange ? (
            <SpeechTtsModelSelect
              model={ttsModel}
              onModelChange={onTtsModelChange}
            />
          ) : null}
          {onSpeechStyleChange ? (
            <SpeechStyleSelect
              model={ttsModel}
              style={speechStyle}
              onStyleChange={onSpeechStyleChange}
            />
          ) : null}
          {onSpeechSpeedChange ? (
            <SpeechSpeedControl
              speed={speechSpeed}
              onSpeedChange={onSpeechSpeedChange}
            />
          ) : null}
        </div>
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
