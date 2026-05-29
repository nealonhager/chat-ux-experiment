import { useEffect, useRef, useState } from 'react'
import { VoicePill } from './components/VoicePill'

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnecting' | 'error'

type TranscriptLine = {
  id: string
  speaker: 'you' | 'assistant'
  text: string
}

type RealtimeEvent = {
  type: string
  delta?: string
  error?: { message?: string }
  response_id?: string
  transcript?: string
}

type AudioInputDevice = {
  deviceId: string
  label: string
}

const MIC_STORAGE_KEY = 'gpt-realtime-mic-id'

function getStoredMicId(): string {
  return localStorage.getItem(MIC_STORAGE_KEY) ?? ''
}

function formatInputDevice(device: MediaDeviceInfo, index: number): AudioInputDevice {
  return {
    deviceId: device.deviceId,
    label: device.label || `Microphone ${index + 1}`,
  }
}

function App() {
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [lines, setLines] = useState<TranscriptLine[]>([])
  const [inputDevices, setInputDevices] = useState<AudioInputDevice[]>([])
  const [selectedMicId, setSelectedMicId] = useState(getStoredMicId)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const assistantDraftsRef = useRef(new Map<string, string>())
  const assistantLineIdsRef = useRef(new Map<string, string>())

  function clearConnectionResources(): void {
    dataChannelRef.current?.close()
    dataChannelRef.current = null

    peerConnectionRef.current?.close()
    peerConnectionRef.current = null

    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause()
      remoteAudioRef.current.srcObject = null
      remoteAudioRef.current = null
    }

    assistantDraftsRef.current.clear()
    assistantLineIdsRef.current.clear()
  }

  function addLine(speaker: TranscriptLine['speaker'], text: string): string {
    const id = crypto.randomUUID()
    const trimmedText = text.trim()
    if (!trimmedText) {
      return id
    }

    setLines((current) => [...current, { id, speaker, text: trimmedText }])
    return id
  }

  function addUserLine(text: string): void {
    const id = crypto.randomUUID()
    const trimmedText = text.trim()
    if (!trimmedText) {
      return
    }

    setLines((current) => {
      let expectedSpeaker: TranscriptLine['speaker'] = 'you'
      let insertAt = -1

      for (let index = 0; index < current.length; index++) {
        if (current[index].speaker !== expectedSpeaker) {
          insertAt = index
          break
        }

        expectedSpeaker = expectedSpeaker === 'you' ? 'assistant' : 'you'
      }

      const newLine: TranscriptLine = { id, speaker: 'you', text: trimmedText }

      if (insertAt === -1) {
        return [...current, newLine]
      }

      return [...current.slice(0, insertAt), newLine, ...current.slice(insertAt)]
    })
  }

  function updateLine(id: string, text: string): void {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, text } : line)))
  }

  function handleRealtimeEvent(rawEvent: MessageEvent<string>): void {
    const event = JSON.parse(rawEvent.data) as RealtimeEvent

    if (event.type === 'conversation.item.input_audio_transcription.completed' && event.transcript) {
      addUserLine(event.transcript)
      return
    }

    if (event.type === 'response.output_audio_transcript.delta' && event.delta) {
      const draftKey = event.response_id ?? 'assistant'
      const nextDraft = `${assistantDraftsRef.current.get(draftKey) ?? ''}${event.delta}`
      assistantDraftsRef.current.set(draftKey, nextDraft)

      const existingId = assistantLineIdsRef.current.get(draftKey)
      if (existingId) {
        updateLine(existingId, nextDraft)
        return
      }

      const id = addLine('assistant', nextDraft)
      assistantLineIdsRef.current.set(draftKey, id)
      return
    }

    if (event.type === 'response.output_audio_transcript.done') {
      const draftKey = event.response_id ?? 'assistant'
      const transcript = event.transcript ?? assistantDraftsRef.current.get(draftKey) ?? ''
      assistantDraftsRef.current.delete(draftKey)

      const existingId = assistantLineIdsRef.current.get(draftKey)
      if (existingId) {
        updateLine(existingId, transcript)
        assistantLineIdsRef.current.delete(draftKey)
        return
      }

      addLine('assistant', transcript)
      return
    }

    if (event.type === 'error') {
      setErrorMessage(event.error?.message ?? 'The Realtime API returned an error.')
      setStatus('error')
    }
  }

  async function refreshInputDevices(): Promise<void> {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const audioInputs = devices
      .filter((device) => device.kind === 'audioinput')
      .map((device, index) => formatInputDevice(device, index))

    setInputDevices(audioInputs)

    setSelectedMicId((currentMicId) => {
      if (currentMicId && !audioInputs.some((device) => device.deviceId === currentMicId)) {
        localStorage.removeItem(MIC_STORAGE_KEY)
        return ''
      }

      return currentMicId
    })
  }

  function handleMicChange(deviceId: string): void {
    setSelectedMicId(deviceId)
    if (deviceId) {
      localStorage.setItem(MIC_STORAGE_KEY, deviceId)
      return
    }

    localStorage.removeItem(MIC_STORAGE_KEY)
  }

  async function startConversation(): Promise<void> {
    setStatus('connecting')
    setErrorMessage('')
    setLines([])

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...(selectedMicId ? { deviceId: { exact: selectedMicId } } : {}),
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      await refreshInputDevices()

      const peerConnection = new RTCPeerConnection()
      const remoteAudio = new Audio()
      remoteAudio.autoplay = true

      peerConnectionRef.current = peerConnection
      localStreamRef.current = stream
      remoteAudioRef.current = remoteAudio

      peerConnection.ontrack = (trackEvent) => {
        remoteAudio.srcObject = trackEvent.streams[0]
        void remoteAudio.play().catch(() => undefined)
      }

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream)
      })

      const dataChannel = peerConnection.createDataChannel('oai-events')
      dataChannelRef.current = dataChannel

      dataChannel.addEventListener('open', () => {
        setStatus('connected')
      })
      dataChannel.addEventListener('message', handleRealtimeEvent)
      dataChannel.addEventListener('close', () => {
        setStatus((currentStatus) => (currentStatus === 'error' ? currentStatus : 'idle'))
      })

      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      const response = await fetch('/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      })

      if (!response.ok) {
        throw new Error((await response.text()) || 'Could not create the Realtime session.')
      }

      await peerConnection.setRemoteDescription({
        sdp: await response.text(),
        type: 'answer',
      })
    } catch (error) {
      clearConnectionResources()
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to connect.')
    }
  }

  function stopConversation(): void {
    setStatus('disconnecting')
    clearConnectionResources()
    setStatus('idle')
  }

  useEffect(() => {
    void refreshInputDevices()

    const handleDeviceChange = () => {
      void refreshInputDevices()
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
      clearConnectionResources()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <VoicePill
        status={status}
        errorMessage={errorMessage}
        inputDevices={inputDevices}
        selectedMicId={selectedMicId}
        onMicChange={handleMicChange}
        onStart={() => void startConversation()}
        onStop={stopConversation}
      />

      <main className="mx-auto mt-24 max-w-2xl space-y-3">
        {lines.length === 0 ? (
          <p className="text-center text-gray-500">Press start and speak to begin.</p>
        ) : (
          lines.map((line) => (
            <p
              key={line.id}
              className={`rounded-lg px-4 py-3 text-sm ${
                line.speaker === 'you' ? 'bg-white text-gray-900' : 'bg-black text-white'
              }`}
            >
              <span className="mb-1 block text-xs font-medium uppercase opacity-60">
                {line.speaker === 'you' ? 'You' : 'Assistant'}
              </span>
              {line.text}
            </p>
          ))
        )}
      </main>
    </div>
  )
}

export default App
