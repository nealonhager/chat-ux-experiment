import { Loader2, Mic, Send } from "lucide-react";
import { useRef } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CHAT_MODEL_ITEMS,
  CHAT_MODELS,
  type ChatModelId,
} from "@/lib/chatModels";
import { cn } from "@/lib/utils";

export type ChatInputBarProps = {
  value: string;
  disabled?: boolean;
  isTranscribing?: boolean;
  isRecording?: boolean;
  size?: "default" | "mini";
  showModelSelect?: boolean;
  placeholder?: string;
  model: ChatModelId;
  onChange: (value: string) => void;
  onModelChange: (model: ChatModelId) => void;
  onSend: (text: string) => void;
  onToggleRecording: () => void;
};

export function ChatInputBar({
  value,
  disabled = false,
  isTranscribing = false,
  isRecording = false,
  size = "default",
  showModelSelect = true,
  placeholder = "Message...",
  model,
  onChange,
  onModelChange,
  onSend,
  onToggleRecording,
}: ChatInputBarProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMini = size === "mini";
  const iconClass = isMini ? "size-3.5" : "size-5";
  const controlSize = isMini ? "size-8" : "size-10";
  const inputDisabled = disabled || isTranscribing;

  function stopEventPropagation(event: React.SyntheticEvent): void {
    event.stopPropagation();
  }

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
    event.stopPropagation();

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  const iconButtonClass = cn(
    "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40",
    controlSize
  );

  function handleModelChange(nextModel: string | null): void {
    if (nextModel && CHAT_MODELS.some((entry) => entry.id === nextModel)) {
      onModelChange(nextModel as ChatModelId);
    }
  }

  return (
    <div
      className={cn(
        "nopan nodrag flex cursor-auto flex-col",
        isMini ? "gap-1" : "gap-1.5"
      )}
      data-composer=""
      onPointerDown={stopEventPropagation}
      onClick={stopEventPropagation}
    >
      <div
        className={cn(
          "flex gap-1.5 rounded-xl border bg-card p-1.5",
          isMini
            ? "items-center border-gray-300/70 bg-white"
            : "items-end gap-2 rounded-2xl p-2"
        )}
      >
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

      {showModelSelect ? (
        <div className="flex justify-end">
          <Select
            items={CHAT_MODEL_ITEMS}
            value={model}
            onValueChange={handleModelChange}
            disabled={disabled}
          >
            <SelectTrigger
              size="sm"
              className={cn(
                "min-w-[7.5rem] max-w-full cursor-pointer border-gray-300/70 bg-white text-muted-foreground",
                isMini ? "h-7 text-[11px]" : "text-xs"
              )}
              aria-label="Chat model"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              side="bottom"
              align="end"
              alignItemWithTrigger={false}
              className="max-h-72 w-max min-w-[12rem]"
            >
              {CHAT_MODELS.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
