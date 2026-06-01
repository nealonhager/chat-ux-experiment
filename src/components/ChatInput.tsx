import { ChatInputBar } from "./ChatInputBar";

type ChatInputProps = {
  value: string;
  disabled?: boolean;
  isTranscribing?: boolean;
  isRecording?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  onToggleRecording: () => void;
};

export function ChatInput({
  value,
  disabled = false,
  isTranscribing = false,
  isRecording = false,
  placeholder = "Message...",
  onChange,
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
        onChange={onChange}
        onSend={onSend}
        onToggleRecording={onToggleRecording}
      />
    </div>
  );
}
