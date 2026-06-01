import { ChatInputBar } from './ChatInputBar'

type ChatInputProps = {
  value: string
  disabled?: boolean
  isTranscribing?: boolean
  isRecording?: boolean
  speechEnabled?: boolean
  isSpeaking?: boolean
  onChange: (value: string) => void
  onSend: (text: string) => void
  onToggleRecording: () => void
  onToggleSpeech: () => void
}

export function ChatInput({
  value,
  disabled = false,
  isTranscribing = false,
  isRecording = false,
  speechEnabled = false,
  isSpeaking = false,
  onChange,
  onSend,
  onToggleRecording,
  onToggleSpeech,
}: ChatInputProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center px-4 pb-6">
      <div className="pointer-events-auto w-full max-w-2xl">
        <ChatInputBar
          value={value}
          disabled={disabled}
          isTranscribing={isTranscribing}
          isRecording={isRecording}
          speechEnabled={speechEnabled}
          isSpeaking={isSpeaking}
          onChange={onChange}
          onSend={onSend}
          onToggleRecording={onToggleRecording}
          onToggleSpeech={onToggleSpeech}
        />
      </div>
    </div>
  )
}
