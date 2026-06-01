export type PanZoomTransform = {
  x: number;
  y: number;
  scale: number;
};

/** Large world-space canvas so panning rarely hits an edge. */
export const WORLD_SIZE = 20_000;

export const DEFAULT_PAN_ZOOM: PanZoomTransform = {
  x: 0,
  y: 0,
  scale: 1,
};

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

export function clampZoom(scale: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

export function getCenteredPan(
  scale: number,
  viewportWidth = window.innerWidth
): Pick<PanZoomTransform, "x" | "y"> {
  return clampPan(viewportWidth / 2 - (WORLD_SIZE / 2) * scale, 0, scale, {
    width: viewportWidth,
    height: window.innerHeight,
  });
}

export type ViewportSize = {
  width: number;
  height: number;
};

export function clampPan(
  x: number,
  y: number,
  scale: number,
  viewport: ViewportSize
): { x: number; y: number } {
  const worldWidth = WORLD_SIZE * scale;
  const worldHeight = WORLD_SIZE * scale;

  const clampedX =
    worldWidth <= viewport.width
      ? (viewport.width - worldWidth) / 2
      : Math.min(0, Math.max(viewport.width - worldWidth, x));

  const clampedY =
    worldHeight <= viewport.height
      ? (viewport.height - worldHeight) / 2
      : Math.min(0, Math.max(viewport.height - worldHeight, y));

  return { x: clampedX, y: clampedY };
}

export function clampTransform(
  transform: PanZoomTransform,
  viewport: ViewportSize = {
    width: window.innerWidth,
    height: window.innerHeight,
  }
): PanZoomTransform {
  const { x, y } = clampPan(
    transform.x,
    transform.y,
    transform.scale,
    viewport
  );
  return { ...transform, x, y };
}

export function zoomAtPoint(
  transform: PanZoomTransform,
  clientX: number,
  clientY: number,
  deltaScale: number,
  viewport: ViewportSize = {
    width: window.innerWidth,
    height: window.innerHeight,
  }
): PanZoomTransform {
  const nextScale = clampZoom(transform.scale * deltaScale);
  const scaleRatio = nextScale / transform.scale;

  return clampTransform(
    {
      x: clientX - (clientX - transform.x) * scaleRatio,
      y: clientY - (clientY - transform.y) * scaleRatio,
      scale: nextScale,
    },
    viewport
  );
}

export function panBy(
  transform: PanZoomTransform,
  deltaX: number,
  deltaY: number
): PanZoomTransform {
  return {
    ...transform,
    x: transform.x + deltaX,
    y: transform.y + deltaY,
  };
}

export function toPanStyle({ x, y }: PanZoomTransform): { transform: string } {
  return { transform: `translate(${x}px, ${y}px)` };
}

export function toZoomStyle({ scale }: PanZoomTransform): { zoom: number } {
  return { zoom: scale };
}

export const MINIMAP_SIZE = 160;
export const CHAT_COLUMN_WIDTH = 672;

export type WorldRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function getViewportWorldRect(
  transform: PanZoomTransform,
  viewport: ViewportSize
): WorldRect {
  return {
    x: -transform.x / transform.scale,
    y: -transform.y / transform.scale,
    width: viewport.width / transform.scale,
    height: viewport.height / transform.scale,
  };
}

export function worldRectToMinimap(
  rect: WorldRect,
  minimapSize = MINIMAP_SIZE
): WorldRect {
  const scale = minimapSize / WORLD_SIZE;
  return {
    x: rect.x * scale,
    y: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

export function minimapPointToWorld(
  minimapX: number,
  minimapY: number,
  minimapSize = MINIMAP_SIZE
): { x: number; y: number } {
  return {
    x: (minimapX / minimapSize) * WORLD_SIZE,
    y: (minimapY / minimapSize) * WORLD_SIZE,
  };
}

export function panToWorldCenter(
  worldX: number,
  worldY: number,
  scale: number,
  viewport: ViewportSize
): Pick<PanZoomTransform, "x" | "y"> {
  return clampPan(
    viewport.width / 2 - worldX * scale,
    viewport.height / 2 - worldY * scale,
    scale,
    viewport
  );
}
