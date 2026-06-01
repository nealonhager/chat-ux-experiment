import { ChatInputBar } from "./ChatInputBar";

type ChatInputProps = {
  value: string;
  disabled?: boolean;
  isTranscribing?: boolean;
  isRecording?: boolean;
  speechEnabled?: boolean;
  isSpeaking?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  onToggleRecording: () => void;
  onToggleSpeech: () => void;
};

export function ChatInput({
  value,
  disabled = false,
  isTranscribing = false,
  isRecording = false,
  speechEnabled = false,
  isSpeaking = false,
  placeholder = "Message...",
  onChange,
  onSend,
  onToggleRecording,
  onToggleSpeech,
}: ChatInputProps) {
  return (
    <div className="pointer-events-auto w-full">
      <ChatInputBar
        value={value}
        disabled={disabled}
        isTranscribing={isTranscribing}
        isRecording={isRecording}
        speechEnabled={speechEnabled}
        isSpeaking={isSpeaking}
        placeholder={placeholder}
        onChange={onChange}
        onSend={onSend}
        onToggleRecording={onToggleRecording}
        onToggleSpeech={onToggleSpeech}
      />
    </div>
  );
}
