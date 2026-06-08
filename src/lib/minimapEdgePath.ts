import { getThreadEdgePath } from "@/lib/threadEdgePath";

const MAX_CORNER_RADIUS = 20;

export function getMinimapThreadPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  return getThreadEdgePath(x1, y1, x2, y2, MAX_CORNER_RADIUS);
}
