import type { WorldRect } from "@/lib/canvasLayout";

export const MINIMAP_PADDING = 10;

export type MinimapTransform = {
  minX: number;
  minY: number;
  scale: number;
  padding: number;
};

export function computeMinimapTransform(
  rects: WorldRect[],
  minimapSize: number,
  padding = MINIMAP_PADDING
): MinimapTransform | null {
  if (rects.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  const contentWidth = Math.max(maxX - minX, 1);
  const contentHeight = Math.max(maxY - minY, 1);
  const innerSize = minimapSize - padding * 2;
  const scale = Math.min(innerSize / contentWidth, innerSize / contentHeight);

  return { minX, minY, scale, padding };
}

export function flowPointToMinimap(
  x: number,
  y: number,
  transform: MinimapTransform
): { x: number; y: number } {
  return {
    x: (x - transform.minX) * transform.scale + transform.padding,
    y: (y - transform.minY) * transform.scale + transform.padding,
  };
}

export function flowRectToMinimap(
  rect: WorldRect,
  transform: MinimapTransform
): WorldRect {
  const topLeft = flowPointToMinimap(rect.x, rect.y, transform);
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: Math.max(rect.width * transform.scale, 2),
    height: Math.max(rect.height * transform.scale, 2),
  };
}

export function minimapPointToFlow(
  minimapX: number,
  minimapY: number,
  transform: MinimapTransform
): { x: number; y: number } {
  return {
    x: (minimapX - transform.padding) / transform.scale + transform.minX,
    y: (minimapY - transform.padding) / transform.scale + transform.minY,
  };
}

export function getViewportFlowRect(
  viewport: { x: number; y: number; zoom: number },
  viewportWidth: number,
  viewportHeight: number
): WorldRect {
  const { x, y, zoom } = viewport;
  return {
    x: -x / zoom,
    y: -y / zoom,
    width: viewportWidth / zoom,
    height: viewportHeight / zoom,
  };
}
