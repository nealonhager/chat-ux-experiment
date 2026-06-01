import { ChatInputBar } from "./ChatInputBar";
import { DEFAULT_CHAT_MODEL, type ChatModelId } from "@/lib/chatModels";

type ChatInputProps = {
  value: string;
  disabled?: boolean;
  isTranscribing?: boolean;
  isRecording?: boolean;
  placeholder?: string;
  model?: ChatModelId;
  onChange: (value: string) => void;
  onModelChange?: (model: ChatModelId) => void;
  onSend: (text: string) => void;
  onToggleRecording: () => void;
};

export function ChatInput({
  value,
  disabled = false,
  isTranscribing = false,
  isRecording = false,
  placeholder = "Message...",
  model = DEFAULT_CHAT_MODEL,
  onChange,
  onModelChange = () => {},
  onSend,
  onToggleRecording,
}: ChatInputProps) {
  return (
    <div className="pointer-events-auto w-full">
      <ChatInputBar
        value={value}
        disabled={disabled}
        isTranscribing={isTranscribing}
        isRecording={isRecording}
        placeholder={placeholder}
        model={model}
        onChange={onChange}
        onModelChange={onModelChange}
        onSend={onSend}
        onToggleRecording={onToggleRecording}
      />
    </div>
  );
}
