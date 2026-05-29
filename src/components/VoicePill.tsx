import { Play, Square } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnecting' | 'error'

type AudioInputDevice = {
  deviceId: string
  label: string
}

const DEFAULT_MIC_VALUE = '__default__'

type VoicePillProps = {
  status: ConnectionStatus
  errorMessage: string
  inputDevices: AudioInputDevice[]
  selectedMicId: string
  onMicChange: (deviceId: string) => void
  onStart: () => void
  onStop: () => void
}

function getStatusLabel(status: ConnectionStatus): string {
  switch (status) {
    case 'connecting':
      return 'Connecting'
    case 'connected':
      return 'Live'
    case 'disconnecting':
      return 'Disconnecting'
    case 'error':
      return 'Error'
    default:
      return 'Idle'
  }
}

export function VoicePill({
  status,
  errorMessage,
  inputDevices,
  selectedMicId,
  onMicChange,
  onStart,
  onStop,
}: VoicePillProps) {
  const micSelectionDisabled = status === 'connecting' || status === 'connected' || status === 'disconnecting'

  return (
    <div className="pointer-events-auto fixed left-1/2 top-4 flex -translate-x-1/2 flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg border bg-card px-4 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Mic</span>
          <Select
            value={selectedMicId || DEFAULT_MIC_VALUE}
            onValueChange={(value) => {
              if (!value) {
                return
              }

              onMicChange(value === DEFAULT_MIC_VALUE ? '' : value)
            }}
            disabled={micSelectionDisabled}
          >
            <SelectTrigger className="w-48" aria-label="Select microphone">
              <SelectValue placeholder="System default" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={DEFAULT_MIC_VALUE}>System default</SelectItem>
                {inputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm font-medium text-muted-foreground">{getStatusLabel(status)}</span>
        <button
          type="button"
          className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-40"
          onClick={onStart}
          disabled={status === 'connecting' || status === 'connected'}
          aria-label="Start conversation"
        >
          <Play className="size-4" />
        </button>
        <button
          type="button"
          className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-40"
          onClick={onStop}
          disabled={status !== 'connected' && status !== 'error'}
          aria-label="Stop conversation"
        >
          <Square className="size-4" />
        </button>
      </div>
      {errorMessage ? (
        <p className="rounded-md bg-destructive/10 px-3 py-1 text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  )
}
