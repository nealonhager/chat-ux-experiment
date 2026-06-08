/** Rounded tree edge from parent bottom to child top. */

export function getThreadEdgePath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  maxCornerRadius = 20
): string {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;

  if (dy <= 0) {
    return `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
  }

  if (Math.abs(dx) < 2) {
    return `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
  }

  const midY = sourceY + dy / 2;
  const radius = Math.min(
    maxCornerRadius,
    Math.abs(dy) / 2 - 1,
    Math.abs(dx) / 2
  );

  if (radius < 2) {
    return `M ${sourceX},${sourceY} L ${sourceX},${midY} L ${targetX},${midY} L ${targetX},${targetY}`;
  }

  const sx = dx > 0 ? 1 : -1;

  return [
    `M ${sourceX},${sourceY}`,
    `L ${sourceX},${midY - radius}`,
    `Q ${sourceX},${midY} ${sourceX + sx * radius},${midY}`,
    `L ${targetX - sx * radius},${midY}`,
    `Q ${targetX},${midY} ${targetX},${midY + radius}`,
    `L ${targetX},${targetY}`,
  ].join(" ");
}
