import { AnimatePresence, motion } from "motion/react";
import { Speech } from "lucide-react";
import { Panel } from "@xyflow/react";

import { ConversationMinimap } from "@/components/ConversationMinimap";

import { TextShimmer } from "@/components/loading-ui/text-shimmer";
import { Button } from "@/components/ui/button";
import type { WorldRect } from "@/lib/canvasLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type FlowChromePanelProps = {
  rootComposerSlot?: WorldRect | null;
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

function SpeechToggleButton({
  speechEnabled,
  isSpeechLoading,
  isSpeaking,
  onToggleSpeech,
}: {
  speechEnabled: boolean;
  isSpeechLoading: boolean;
  isSpeaking: boolean;
  onToggleSpeech: () => void;
}) {
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

type MinimapSelectOption = { id: string; label: string };

function MinimapSelect<T extends string>({
  ariaLabel,
  disabled = false,
  items,
  options,
  value,
  onValueChange,
}: {
  ariaLabel: string;
  disabled?: boolean;
  items: Array<{ value: T; label: string }>;
  options: readonly MinimapSelectOption[];
  value: T;
  onValueChange: (value: string | null) => void;
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        size="sm"
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

export function FlowChromePanel({
  rootComposerSlot = null,
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
}: FlowChromePanelProps) {
  return (
    <Panel
      position="top-left"
      className="flex flex-col gap-2 rounded-xl border bg-card/95 p-2 backdrop-blur"
    >
      <ConversationMinimap rootComposerSlot={rootComposerSlot} />
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
            <MinimapSelect
              ariaLabel="Speaker voice"
              items={SPEECH_VOICE_ITEMS}
              options={SPEECH_VOICES}
              value={speechVoice}
              onValueChange={(nextVoice) => {
                if (
                  nextVoice &&
                  SPEECH_VOICES.some((entry) => entry.id === nextVoice)
                ) {
                  onSpeechVoiceChange(nextVoice as SpeechVoiceId);
                }
              }}
            />
          ) : null}
          {onTtsModelChange ? (
            <MinimapSelect
              ariaLabel="Text-to-speech model"
              items={TTS_MODEL_ITEMS}
              options={TTS_MODELS}
              value={ttsModel}
              onValueChange={(nextModel) => {
                if (
                  nextModel &&
                  TTS_MODELS.some((entry) => entry.id === nextModel)
                ) {
                  onTtsModelChange(nextModel as TtsModelId);
                }
              }}
            />
          ) : null}
          {onSpeechStyleChange ? (
            <MinimapSelect
              ariaLabel="Speech style"
              disabled={!ttsModelSupportsInstructions(ttsModel)}
              items={SPEECH_STYLE_ITEMS}
              options={SPEECH_STYLES}
              value={speechStyle}
              onValueChange={(nextStyle) => {
                if (
                  nextStyle &&
                  SPEECH_STYLES.some((entry) => entry.id === nextStyle)
                ) {
                  onSpeechStyleChange(nextStyle as SpeechStyleId);
                }
              }}
            />
          ) : null}
          {onSpeechSpeedChange ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <label htmlFor="speech-speed">Speed</label>
                <span className="tabular-nums">{speechSpeed.toFixed(2)}×</span>
              </div>
              <input
                id="speech-speed"
                type="range"
                min={SPEECH_SPEED_MIN}
                max={SPEECH_SPEED_MAX}
                step={SPEECH_SPEED_STEP}
                value={speechSpeed}
                onChange={(event) =>
                  onSpeechSpeedChange(Number.parseFloat(event.target.value))
                }
                className="h-1.5 w-full cursor-pointer accent-primary"
                aria-label="Speech speed"
              />
            </div>
          ) : null}
        </div>
      ) : null}
      {onClearConversation ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!hasMessages}
          className="w-full text-muted-foreground"
          onClick={onClearConversation}
        >
          Clear conversation
        </Button>
      ) : null}
    </Panel>
  );
}
