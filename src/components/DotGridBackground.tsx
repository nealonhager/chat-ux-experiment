import { dotGridConfig } from '@/config/dotGrid'
import { WORLD_SIZE } from '@/lib/panZoom'

export function DotGridBackground() {
  const { dotSize, spacing, color, angle } = dotGridConfig
  const patternId = 'dot-grid'

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0"
      width={WORLD_SIZE}
      height={WORLD_SIZE}
      viewBox={`0 0 ${WORLD_SIZE} ${WORLD_SIZE}`}
    >
      <defs>
        <pattern id={patternId} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
          <circle cx={spacing / 2} cy={spacing / 2} r={dotSize / 2} fill={color} />
        </pattern>
      </defs>
      <rect
        width={WORLD_SIZE}
        height={WORLD_SIZE}
        fill={`url(#${patternId})`}
        transform={`rotate(${angle} ${WORLD_SIZE / 2} ${WORLD_SIZE / 2})`}
      />
    </svg>
  )
}
