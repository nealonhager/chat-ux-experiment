import { createContext, useContext } from 'react'

import { type PanZoomTransform, type ViewportSize } from '@/lib/panZoom'

export type PanZoomContextValue = {
  transform: PanZoomTransform
  viewportSize: ViewportSize
  updateTransform: (next: PanZoomTransform) => void
  panToWorldPoint: (worldX: number, worldY: number) => void
}

export const PanZoomContext = createContext<PanZoomContextValue | null>(null)

export function usePanZoom(): PanZoomContextValue {
  const value = useContext(PanZoomContext)
  if (!value) {
    throw new Error('usePanZoom must be used within PanZoomLayer')
  }
  return value
}
