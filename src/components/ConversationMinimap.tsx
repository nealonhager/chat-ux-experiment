import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Edge,
  type Node,
  useEdges,
  useNodes,
  useReactFlow,
  useViewport,
} from "@xyflow/react";

import {
  type ChatBubbleNodeData,
  type ConversationEdgeData,
} from "@/lib/conversationFlowLayout";
import { MINIMAP_SIZE, type WorldRect } from "@/lib/canvasLayout";
import { getMinimapThreadPath } from "@/lib/minimapEdgePath";
import {
  computeMinimapTransform,
  flowPointToMinimap,
  flowRectToMinimap,
  getViewportFlowRect,
  minimapPointToFlow,
  type MinimapTransform,
} from "@/lib/minimapLayout";
import { cn } from "@/lib/utils";

type MinimapBubble = {
  id: string;
  role: "user" | "assistant" | "thinking" | "composer";
  isActive: boolean;
  rect: { x: number; y: number; width: number; height: number };
};

type MinimapSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

function getNodeRect(node: Node): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return {
    x: node.position.x,
    y: node.position.y,
    width: node.width ?? 0,
    height: node.height ?? 0,
  };
}

function getMinimapBubbles(
  nodes: Node[],
  rootComposerSlot: WorldRect | null
): MinimapBubble[] {
  const bubbles: MinimapBubble[] = nodes.map((node) => {
    const rect = getNodeRect(node);
    const data = node.data as ChatBubbleNodeData;

    return {
      id: node.id,
      role: data.role,
      isActive: data.isActive,
      rect,
    };
  });

  if (rootComposerSlot) {
    bubbles.push({
      id: "root-composer",
      role: "composer",
      isActive: false,
      rect: rootComposerSlot,
    });
  }

  return bubbles;
}

function getMinimapSegments(nodes: Node[], edges: Edge[]): MinimapSegment[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return edges.flatMap((edge) => {
    const layout = edge.data as ConversationEdgeData | undefined;
    if (layout?.sourcePoint && layout?.targetPoint) {
      return [
        {
          x1: layout.sourcePoint.x,
          y1: layout.sourcePoint.y,
          x2: layout.targetPoint.x,
          y2: layout.targetPoint.y,
        },
      ];
    }

    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) {
      return [];
    }

    const sourceRect = getNodeRect(source);
    const targetRect = getNodeRect(target);

    return [
      {
        x1: sourceRect.x + sourceRect.width / 2,
        y1: sourceRect.y + sourceRect.height,
        x2: targetRect.x + targetRect.width / 2,
        y2: targetRect.y,
      },
    ];
  });
}

function bubbleClassName(role: MinimapBubble["role"]): string {
  switch (role) {
    case "user":
      return "bg-black/90";
    case "assistant":
    case "thinking":
    case "composer":
      return "bg-white/90 ring-1 ring-slate-300/80";
  }
}

function mapSegmentPath(
  segment: MinimapSegment,
  transform: MinimapTransform
): string {
  const start = flowPointToMinimap(segment.x1, segment.y1, transform);
  const end = flowPointToMinimap(segment.x2, segment.y2, transform);
  return getMinimapThreadPath(start.x, start.y, end.x, end.y);
}

export function ConversationMinimap({
  rootComposerSlot = null,
}: {
  rootComposerSlot?: WorldRect | null;
}) {
  const { setCenter, getZoom } = useReactFlow();
  const viewport = useViewport();
  const nodes = useNodes();
  const edges = useEdges();
  const minimapRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const bubbles = useMemo(
    () => getMinimapBubbles(nodes, rootComposerSlot),
    [nodes, rootComposerSlot]
  );
  const segments = useMemo(
    () => getMinimapSegments(nodes, edges),
    [nodes, edges]
  );

  const transform = useMemo(
    () =>
      computeMinimapTransform(
        bubbles.map((bubble) => bubble.rect),
        MINIMAP_SIZE
      ),
    [bubbles]
  );

  const viewportRect = useMemo(() => {
    if (!transform) {
      return null;
    }

    const flowViewport = getViewportFlowRect(
      viewport,
      window.innerWidth,
      window.innerHeight
    );
    return flowRectToMinimap(flowViewport, transform);
  }, [transform, viewport]);

  const mappedSegmentPaths = useMemo(() => {
    if (!transform) {
      return [];
    }

    return segments.map((segment) => mapSegmentPath(segment, transform));
  }, [segments, transform]);

  const mappedBubbles = useMemo(() => {
    if (!transform) {
      return [];
    }

    return bubbles.map((bubble) => ({
      ...bubble,
      minimap: flowRectToMinimap(bubble.rect, transform),
    }));
  }, [bubbles, transform]);

  const navigateFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (!transform || !minimapRef.current) {
        return;
      }

      const rect = minimapRef.current.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const flowPoint = minimapPointToFlow(localX, localY, transform);

      setCenter(flowPoint.x, flowPoint.y, {
        zoom: getZoom(),
        duration: 0,
      });
    },
    [getZoom, setCenter, transform]
  );

  useEffect(() => {
    function handlePointerMove(event: PointerEvent): void {
      if (!isDraggingRef.current) {
        return;
      }

      navigateFromClientPoint(event.clientX, event.clientY);
    }

    function handlePointerUp(): void {
      if (!isDraggingRef.current) {
        return;
      }

      isDraggingRef.current = false;
      setIsDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [navigateFromClientPoint]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0 || !transform) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    isDraggingRef.current = true;
    setIsDragging(true);
    navigateFromClientPoint(event.clientX, event.clientY);
  }

  return (
    <div
      ref={minimapRef}
      role="img"
      aria-label="Canvas minimap. Click or drag to navigate."
      className={cn(
        "relative cursor-crosshair overflow-hidden rounded-md border bg-gray-50",
        isDragging && "ring-2 ring-primary/40"
      )}
      style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE }}
      onPointerDown={handlePointerDown}
    >
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0"
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
      >
        {mappedSegmentPaths.map((path, index) => (
          <path
            key={index}
            d={path}
            fill="none"
            stroke="var(--color-slate-300)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      {mappedBubbles.map((bubble) => (
        <div
          key={bubble.id}
          aria-hidden
          className={cn(
            "absolute rounded-[2px]",
            bubbleClassName(bubble.role),
            bubble.isActive &&
              "ring-2 ring-primary ring-offset-1 ring-offset-gray-50"
          )}
          style={{
            left: bubble.minimap.x,
            top: bubble.minimap.y,
            width: bubble.minimap.width,
            height: bubble.minimap.height,
          }}
        />
      ))}
      {viewportRect ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-sm border-2 border-primary bg-primary/15"
          style={{
            left: viewportRect.x,
            top: viewportRect.y,
            width: Math.max(viewportRect.width, 4),
            height: Math.max(viewportRect.height, 4),
          }}
        />
      ) : null}
    </div>
  );
}
