import { useEffect, useRef, useState } from 'react'

import { ChatBubbles, type ChatMessage } from './components/ChatBubbles'
import { ChatInput } from './components/ChatInput'
import { DotGridBackground } from './components/DotGridBackground'
import { PanZoomLayer } from './components/PanZoomLayer'
import { RealtimeTranscriptionSession } from './lib/realtimeTranscription'
import { SpeechPlayer } from './lib/speechSynthesis'

type ChatMessagePayload = {
  role: 'user' | 'assistant'
  content: string
}

type InputTarget = 'main' | 'thread'

function joinText(base: string, addition: string): string {
  const trimmedBase = base.trim()
  const trimmedAddition = addition.trim()
  if (!trimmedAddition) {
    return trimmedBase
  }
  if (!trimmedBase) {
    return trimmedAddition
  }
  return `${trimmedBase} ${trimmedAddition}`
}

function getLatestAssistantMessageId(messages: ChatMessage[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'assistant') {
      return messages[index].id
    }
  }

  return null
}

const SPEECH_STORAGE_KEY = 'gpt-chat-speech-enabled'

function getStoredSpeechEnabled(): boolean {
  return localStorage.getItem(SPEECH_STORAGE_KEY) === 'true'
}

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [threadInputValue, setThreadInputValue] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [activeInputTarget, setActiveInputTarget] = useState<InputTarget>('main')
  const [speechEnabled, setSpeechEnabled] = useState(getStoredSpeechEnabled)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)

  const transcriptionSessionRef = useRef<RealtimeTranscriptionSession | null>(null)
  const speechPlayerRef = useRef(new SpeechPlayer())
  const speechEnabledRef = useRef(speechEnabled)
  const transcriptionBaseRef = useRef('')
  const activeInputTargetRef = useRef<InputTarget>('main')

  useEffect(() => {
    speechEnabledRef.current = speechEnabled
  }, [speechEnabled])

  useEffect(() => {
    activeInputTargetRef.current = activeInputTarget
  }, [activeInputTarget])

  useEffect(() => {
    return () => {
      transcriptionSessionRef.current?.dispose()
      speechPlayerRef.current.stop()
    }
  }, [])

  function setInputText(target: InputTarget, value: string): void {
    if (target === 'main') {
      setInputValue(value)
      return
    }

    setThreadInputValue(value)
  }

  async function speakResponse(text: string, messageId?: string): Promise<void> {
    setIsSpeaking(true)
    setSpeakingMessageId(messageId ?? null)
    setErrorMessage('')

    try {
      await speechPlayerRef.current.speak(text)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to play speech.')
    } finally {
      setIsSpeaking(false)
      setSpeakingMessageId(null)
    }
  }

  function handleFork(messageId: string): void {
    setMessages((current) => {
      const index = current.findIndex((message) => message.id === messageId)
      if (index === -1) {
        return current
      }

      return current.slice(0, index + 1)
    })
  }

  async function handleCopy(content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to copy message.')
    }
  }

  function handleSpeakMessage(messageId: string, content: string): void {
    speechPlayerRef.current.stop()
    void speakResponse(content, messageId)
  }

  async function sendMessage(text: string, branchFromMessageId?: string): Promise<void> {
    const trimmedText = text.trim()
    if (!trimmedText || isSending) {
      return
    }

    if (transcriptionSessionRef.current) {
      stopRecording()
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedText,
    }

    let baseMessages = messages
    if (branchFromMessageId) {
      const branchIndex = messages.findIndex((message) => message.id === branchFromMessageId)
      if (branchIndex !== -1) {
        baseMessages = messages.slice(0, branchIndex + 1)
      }
    }

    const nextMessages = [...baseMessages, userMessage]
    setMessages(nextMessages)

    if (branchFromMessageId) {
      setThreadInputValue('')
    } else {
      setInputValue('')
    }

    transcriptionBaseRef.current = ''
    setErrorMessage('')
    setIsSending(true)

    try {
      const payload: ChatMessagePayload[] = nextMessages.map(({ role, content }) => ({
        role,
        content,
      }))

      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      })

      if (!response.ok) {
        throw new Error((await response.text()) || 'Could not get a response.')
      }

      const data = (await response.json()) as { content: string }
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.content,
        },
      ])

      if (speechEnabledRef.current) {
        void speakResponse(data.content)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send message.')
    } finally {
      setIsSending(false)
    }
  }

  function handleThreadSend(text: string): void {
    const branchFromMessageId = getLatestAssistantMessageId(messages)
    if (!branchFromMessageId) {
      return
    }

    void sendMessage(text, branchFromMessageId)
  }

  async function startRecording(target: InputTarget): Promise<void> {
    setErrorMessage('')
    setIsConnecting(true)
    setActiveInputTarget(target)
    activeInputTargetRef.current = target
    transcriptionBaseRef.current = target === 'main' ? inputValue : threadInputValue

    let session: RealtimeTranscriptionSession | null = null
    session = new RealtimeTranscriptionSession({
      onConnected: () => {
        if (transcriptionSessionRef.current !== session) {
          return
        }
        setIsConnecting(false)
        setIsRecording(true)
      },
      onDelta: (_delta, draft) => {
        if (transcriptionSessionRef.current !== session) {
          return
        }
        setInputText(activeInputTargetRef.current, joinText(transcriptionBaseRef.current, draft))
      },
      onCompleted: (transcript) => {
        if (transcriptionSessionRef.current !== session) {
          return
        }
        transcriptionBaseRef.current = joinText(transcriptionBaseRef.current, transcript)
        setInputText(activeInputTargetRef.current, transcriptionBaseRef.current)
      },
      onError: (message) => {
        if (transcriptionSessionRef.current !== session) {
          return
        }
        setErrorMessage(message)
      },
    })

    transcriptionSessionRef.current = session

    try {
      await session.start()
    } catch (error) {
      if (transcriptionSessionRef.current === session) {
        transcriptionSessionRef.current = null
      }
      session.dispose()
      setIsConnecting(false)
      setIsRecording(false)
      setErrorMessage(error instanceof Error ? error.message : 'Could not access microphone.')
    }
  }

  function stopRecording(): void {
    setIsRecording(false)
    setIsConnecting(false)

    const session = transcriptionSessionRef.current
    if (!session) {
      return
    }

    transcriptionSessionRef.current = null
    session.commitAndClose()
  }

  function handleToggleRecording(target: InputTarget): void {
    if (isSending) {
      return
    }

    if ((isRecording || isConnecting) && activeInputTarget === target) {
      stopRecording()
      return
    }

    if (isRecording || isConnecting) {
      stopRecording()
    }

    void startRecording(target)
  }

  function handleToggleSpeech(): void {
    setSpeechEnabled((current) => {
      const next = !current
      localStorage.setItem(SPEECH_STORAGE_KEY, String(next))
      if (!next) {
        speechPlayerRef.current.stop()
        setIsSpeaking(false)
        setSpeakingMessageId(null)
      }
      return next
    })
  }

  const hasLatestAssistant = getLatestAssistantMessageId(messages) !== null

  return (
    <div className="relative min-h-screen overflow-hidden">
      <PanZoomLayer minimapMessages={messages} minimapIsSending={isSending}>
        <DotGridBackground />
        <ChatBubbles
          messages={messages}
          isSending={isSending}
          errorMessage={errorMessage}
          speakingMessageId={speakingMessageId}
          threadInput={
            hasLatestAssistant
              ? {
                  value: threadInputValue,
                  disabled: isSending,
                  isTranscribing: isConnecting && activeInputTarget === 'thread',
                  isRecording: isRecording && activeInputTarget === 'thread',
                  speechEnabled,
                  isSpeaking,
                  onChange: setThreadInputValue,
                  onSend: handleThreadSend,
                  onToggleRecording: () => handleToggleRecording('thread'),
                  onToggleSpeech: handleToggleSpeech,
                }
              : undefined
          }
          onFork={handleFork}
          onCopy={(content) => void handleCopy(content)}
          onSpeak={handleSpeakMessage}
        />
      </PanZoomLayer>

      <ChatInput
        value={inputValue}
        disabled={isSending}
        isRecording={isRecording && activeInputTarget === 'main'}
        isTranscribing={isConnecting && activeInputTarget === 'main'}
        speechEnabled={speechEnabled}
        isSpeaking={isSpeaking}
        onChange={setInputValue}
        onSend={(text) => void sendMessage(text)}
        onToggleRecording={() => handleToggleRecording('main')}
        onToggleSpeech={handleToggleSpeech}
      />
    </div>
  )
}

export default App
