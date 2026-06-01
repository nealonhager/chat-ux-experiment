import { type ChatMessage } from '@/components/ChatBubbles'
import { CHAT_COLUMN_WIDTH, type WorldRect, WORLD_SIZE } from '@/lib/panZoom'

export const CHAT_LAYOUT = {
  paddingX: 16,
  paddingTop: 32,
  gap: 12,
  bubblePaddingX: 16,
  bubblePaddingY: 12,
  fontSize: 14,
  lineHeight: 20,
  minBubbleHeight: 44,
} as const

export type MinimapBubble = WorldRect & {
  id: string
  role: 'user' | 'assistant' | 'thinking'
}

function getChatColumnWorldX(): number {
  return (WORLD_SIZE - CHAT_COLUMN_WIDTH) / 2
}

function getBubbleContentWidth(): number {
  return CHAT_COLUMN_WIDTH - CHAT_LAYOUT.paddingX * 2 - CHAT_LAYOUT.bubblePaddingX * 2
}

function estimateBubbleHeight(content: string): number {
  const charsPerLine = Math.max(24, Math.floor(getBubbleContentWidth() / 7.5))
  const lines = Math.max(1, Math.ceil(content.length / charsPerLine))
  const textHeight = lines * CHAT_LAYOUT.lineHeight
  return Math.max(CHAT_LAYOUT.minBubbleHeight, CHAT_LAYOUT.bubblePaddingY * 2 + textHeight)
}

export function getBubbleWorldRects(
  messages: ChatMessage[],
  isSending = false,
): MinimapBubble[] {
  const bubbleX = getChatColumnWorldX() + CHAT_LAYOUT.paddingX
  const bubbleWidth = CHAT_COLUMN_WIDTH - CHAT_LAYOUT.paddingX * 2
  let y = CHAT_LAYOUT.paddingTop

  const bubbles: MinimapBubble[] = messages.map((message) => {
    const height = estimateBubbleHeight(message.content)
    const bubble: MinimapBubble = {
      id: message.id,
      role: message.role,
      x: bubbleX,
      y,
      width: bubbleWidth,
      height,
    }
    y += height + CHAT_LAYOUT.gap
    return bubble
  })

  if (isSending) {
    const height = estimateBubbleHeight('Thinking...')
    bubbles.push({
      id: 'thinking',
      role: 'thinking',
      x: bubbleX,
      y,
      width: bubbleWidth * 0.88,
      height,
    })
  }

  return bubbles
}

export type ThreadSegment = {
  x1: number
  y1: number
  x2: number
  y2: number
}

export function getBubbleThreadSegments(bubbles: MinimapBubble[]): ThreadSegment[] {
  const segments: ThreadSegment[] = []

  for (let index = 0; index < bubbles.length - 1; index += 1) {
    const current = bubbles[index]
    const next = bubbles[index + 1]

    segments.push({
      x1: current.x + current.width / 2,
      y1: current.y + current.height,
      x2: next.x + next.width / 2,
      y2: next.y,
    })
  }

  return segments
}
