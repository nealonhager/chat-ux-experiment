import { Loader2, Mic, Send, Speech } from "lucide-react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

export type ChatInputBarProps = {
  value: string;
  disabled?: boolean;
  isTranscribing?: boolean;
  isRecording?: boolean;
  speechEnabled?: boolean;
  isSpeaking?: boolean;
  size?: "default" | "mini";
  placeholder?: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  onToggleRecording: () => void;
  onToggleSpeech: () => void;
};

export function ChatInputBar({
  value,
  disabled = false,
  isTranscribing = false,
  isRecording = false,
  speechEnabled = false,
  isSpeaking = false,
  size = "default",
  placeholder = "Message...",
  onChange,
  onSend,
  onToggleRecording,
  onToggleSpeech,
}: ChatInputBarProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMini = size === "mini";
  const iconClass = isMini ? "size-3.5" : "size-5";
  const controlSize = isMini ? "size-8" : "size-10";
  const inputDisabled = disabled || isTranscribing;

  function handleSubmit(): void {
    const trimmed = value.trim();
    if (!trimmed || disabled) {
      return;
    }

    onSend(trimmed);
    inputRef.current?.focus();
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  const iconButtonClass = cn(
    "inline-flex shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-40",
    controlSize
  );

  return (
    <div
      className={cn(
        "flex gap-1.5 rounded-xl border bg-card p-1.5",
        isMini
          ? "items-center border-gray-300/70 bg-white"
          : "items-end gap-2 rounded-2xl p-2"
      )}
      data-no-pan=""
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={cn(
          iconButtonClass,
          speechEnabled
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        onClick={onToggleSpeech}
        disabled={disabled}
        aria-label={
          speechEnabled ? "Disable spoken responses" : "Enable spoken responses"
        }
        aria-pressed={speechEnabled}
      >
        {isSpeaking ? (
          <Loader2 className={cn(iconClass, "animate-spin")} />
        ) : (
          <Speech className={iconClass} />
        )}
      </button>

      <button
        type="button"
        className={cn(
          iconButtonClass,
          isRecording && !disabled
            ? "bg-destructive text-white"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        onClick={onToggleRecording}
        disabled={inputDisabled}
        aria-label={isRecording ? "Stop recording" : "Record with Whisper"}
      >
        {isTranscribing ? (
          <Loader2 className={cn(iconClass, "animate-spin")} />
        ) : (
          <Mic className={iconClass} />
        )}
      </button>

      <textarea
        ref={inputRef}
        rows={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={inputDisabled}
        className={cn(
          "block min-w-0 flex-1 resize-none bg-transparent outline-none select-text placeholder:text-muted-foreground disabled:opacity-50",
          isMini
            ? "min-h-8 px-1 text-xs leading-8"
            : "min-h-10 px-1 text-sm leading-10"
        )}
      />

      <button
        type="button"
        className={cn(iconButtonClass, "bg-primary text-primary-foreground")}
        onClick={handleSubmit}
        disabled={inputDisabled || !value.trim()}
        aria-label="Send message"
      >
        <Send className={iconClass} />
      </button>
    </div>
  );
}
