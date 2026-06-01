import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { usePanZoom } from '@/components/PanZoomContext'
import { getBubbleThreadSegments, getBubbleWorldRectsFromTree } from '@/lib/chatBubbleLayout'
import type { ConversationTree } from '@/lib/conversationTree'
import {
  getViewportWorldRect,
  MINIMAP_SIZE,
  minimapPointToWorld,
  WORLD_SIZE,
  worldRectToMinimap,
} from '@/lib/panZoom'
import { cn } from '@/lib/utils'

type PanZoomMinimapProps = {
  tree?: ConversationTree
  isSending?: boolean
  thinkingParentId?: string | null
  className?: string
}

function bubbleClassName(role: 'user' | 'assistant' | 'thinking'): string {
  switch (role) {
    case 'user':
      return 'bg-blue-400/90'
    case 'assistant':
      return 'border border-gray-300 bg-white/90'
    case 'thinking':
      return 'bg-muted/90'
  }
}

export function PanZoomMinimap({
  tree,
  isSending = false,
  thinkingParentId = null,
  className,
}: PanZoomMinimapProps) {
  const { transform, viewportSize, panToWorldPoint } = usePanZoom()
  const minimapRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  const bubbles = useMemo(() => {
    if (!tree) {
      return []
    }
    return getBubbleWorldRectsFromTree(tree, isSending, thinkingParentId).map((bubble) => ({
      ...bubble,
      minimap: worldRectToMinimap(bubble),
    }))
  }, [tree, isSending, thinkingParentId])

  const viewportRect = worldRectToMinimap(getViewportWorldRect(transform, viewportSize))
  const threadSegments = getBubbleThreadSegments(bubbles).map((segment) => ({
    x1: segment.x1 * (MINIMAP_SIZE / WORLD_SIZE),
    y1: segment.y1 * (MINIMAP_SIZE / WORLD_SIZE),
    x2: segment.x2 * (MINIMAP_SIZE / WORLD_SIZE),
    y2: segment.y2 * (MINIMAP_SIZE / WORLD_SIZE),
  }))

  const navigateFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = minimapRef.current?.getBoundingClientRect()
      if (!rect) {
        return
      }

      const localX = clientX - rect.left
      const localY = clientY - rect.top
      const worldPoint = minimapPointToWorld(localX, localY)
      panToWorldPoint(worldPoint.x, worldPoint.y)
    },
    [panToWorldPoint],
  )

  useEffect(() => {
    function handlePointerMove(event: PointerEvent): void {
      if (!isDraggingRef.current) {
        return
      }

      navigateFromClientPoint(event.clientX, event.clientY)
    }

    function handlePointerUp(): void {
      if (!isDraggingRef.current) {
        return
      }

      isDraggingRef.current = false
      setIsDragging(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [navigateFromClientPoint])

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    isDraggingRef.current = true
    setIsDragging(true)
    navigateFromClientPoint(event.clientX, event.clientY)
  }

  if (!tree) {
    return null
  }

  return (
    <div
      className={cn(
        'pointer-events-auto fixed left-4 top-4 z-40 rounded-xl border bg-card/95 p-2 backdrop-blur',
        className,
      )}
    >
      <div
        ref={minimapRef}
        role="img"
        aria-label="Canvas minimap. Click or drag to navigate."
        className={cn(
          'relative cursor-crosshair overflow-hidden rounded-md border bg-gray-50',
          isDragging && 'ring-2 ring-primary/40',
        )}
        style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE }}
        onPointerDown={handlePointerDown}
      >
        <svg aria-hidden className="pointer-events-none absolute inset-0" width={MINIMAP_SIZE} height={MINIMAP_SIZE}>
          {threadSegments.map((segment, index) => (
            <line
              key={index}
              x1={segment.x1}
              y1={segment.y1}
              x2={segment.x2}
              y2={segment.y2}
              stroke="var(--color-slate-300)"
              strokeWidth={1.5}
            />
          ))}
        </svg>

        {bubbles.map((bubble) => (
          <div
            key={bubble.id}
            aria-hidden
            className={cn('absolute rounded-[2px]', bubbleClassName(bubble.role))}
            style={{
              left: bubble.minimap.x,
              top: bubble.minimap.y,
              width: Math.max(bubble.minimap.width, 2),
              height: Math.max(bubble.minimap.height, 2),
            }}
          />
        ))}

        <div
          aria-hidden
          className="absolute rounded-sm border-2 border-primary bg-primary/15"
          style={{
            left: viewportRect.x,
            top: viewportRect.y,
            width: Math.max(viewportRect.width, 4),
            height: Math.max(viewportRect.height, 4),
          }}
        />
      </div>
    </div>
  )
}
