import { BaseEdge, type EdgeProps } from "@xyflow/react";

import type { ConversationEdgeData } from "@/lib/conversationFlowLayout";
import { NODE_SPACING } from "@/lib/layoutSpacing";
import { getThreadEdgePath } from "@/lib/threadEdgePath";

const MAX_CORNER_RADIUS = Math.min(24, 6 + NODE_SPACING * 6);

export function ConversationEdge({
  id,
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps) {
  const layout = data as ConversationEdgeData | undefined;
  const sx = layout?.sourcePoint.x ?? sourceX;
  const sy = layout?.sourcePoint.y ?? sourceY;
  const tx = layout?.targetPoint.x ?? targetX;
  const ty = layout?.targetPoint.y ?? targetY;

  const path = getThreadEdgePath(sx, sy, tx, ty, MAX_CORNER_RADIUS);

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        stroke: "var(--color-slate-300)",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }}
    />
  );
}
