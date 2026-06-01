import { Copy, GitFork, Loader2, Speech } from 'lucide-react'
import type { ReactNode } from 'react'

import { ChatInputBar } from '@/components/ChatInputBar'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type ThreadInputProps = {
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

type ChatBubblesProps = {
  messages: ChatMessage[]
  isSending?: boolean
  errorMessage?: string
  speakingMessageId?: string | null
  threadInput?: ThreadInputProps
  onFork?: (messageId: string) => void
  onCopy?: (content: string) => void
  onSpeak?: (messageId: string, content: string) => void
}

function MessageThreadConnector() {
  return <div aria-hidden className="mx-auto h-3 w-0.5 shrink-0 bg-slate-300" />
}

function getLatestAssistantMessageId(messages: ChatMessage[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'assistant') {
      return messages[index].id
    }
  }

  return null
}

type ChatBubbleProps = {
  role: ChatMessage['role']
  content: string
  messageId?: string
  isSpeaking?: boolean
  showThreadInput?: boolean
  threadInput?: ThreadInputProps
  onFork?: (messageId: string) => void
  onCopy?: (content: string) => void
  onSpeak?: (messageId: string, content: string) => void
}

function BubbleActionButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-200/80 hover:text-gray-600"
    >
      {children}
    </button>
  )
}

function ChatBubble({
  role,
  content,
  messageId,
  isSpeaking = false,
  showThreadInput = false,
  threadInput,
  onFork,
  onCopy,
  onSpeak,
}: ChatBubbleProps) {
  const showActions = role === 'assistant' && messageId && onFork && onCopy && onSpeak

  return (
    <div
      className={`pointer-events-auto relative rounded-lg border-2 px-4 py-3 text-sm font-medium ${
        role === 'user'
          ? 'border-blue-300 bg-blue-50 text-blue-700'
          : 'border-gray-300 bg-gray-100 text-gray-500'
      }`}
    >
      <div>{content}</div>

      {showActions ? (
        <div className="mt-2 flex gap-0.5 border-t border-gray-300/70 pt-2">
          <BubbleActionButton label="Fork conversation" onClick={() => onFork(messageId)}>
            <GitFork className="size-4 rotate-180" />
          </BubbleActionButton>
          <BubbleActionButton label="Copy message" onClick={() => onCopy(content)}>
            <Copy className="size-4" />
          </BubbleActionButton>
          <BubbleActionButton label="Speak message" onClick={() => onSpeak(messageId, content)}>
            {isSpeaking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Speech className="size-4" />
            )}
          </BubbleActionButton>
        </div>
      ) : null}

      {showThreadInput && threadInput ? (
        <div className="mt-2">
          <ChatInputBar size="mini" placeholder="Continue this thread..." {...threadInput} />
        </div>
      ) : null}
    </div>
  )
}

export function ChatBubbles({
  messages,
  isSending = false,
  errorMessage = '',
  speakingMessageId = null,
  threadInput,
  onFork,
  onCopy,
  onSpeak,
}: ChatBubblesProps) {
  const hasThread = messages.length > 0 || isSending
  const latestAssistantMessageId = getLatestAssistantMessageId(messages)

  return (
    <main className="pointer-events-none absolute left-1/2 top-0 w-full max-w-2xl -translate-x-1/2 px-4 pb-32 pt-8">
      {hasThread ? (
        <div className="flex flex-col">
          {messages.map((message, index) => (
            <div key={message.id} className="flex flex-col">
              {index > 0 ? <MessageThreadConnector /> : null}
              <ChatBubble
                role={message.role}
                content={message.content}
                messageId={message.id}
                isSpeaking={speakingMessageId === message.id}
                showThreadInput={
                  message.role === 'assistant' && message.id === latestAssistantMessageId && Boolean(threadInput)
                }
                threadInput={threadInput}
                onFork={message.role === 'assistant' ? onFork : undefined}
                onCopy={message.role === 'assistant' ? onCopy : undefined}
                onSpeak={message.role === 'assistant' ? onSpeak : undefined}
              />
            </div>
          ))}

          {isSending ? (
            <div className="flex flex-col">
              {messages.length > 0 ? <MessageThreadConnector /> : null}
              <ChatBubble role="assistant" content="Thinking..." />
            </div>
          ) : null}
        </div>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 text-center text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </main>
  )
}
