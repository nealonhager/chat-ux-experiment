const BASE_GAP = 16;
const BASE_SIBLING_GAP = 24;

export const NODE_SPACING = 3;

export type LayoutGaps = {
  gap: number;
  siblingGap: number;
};

export function resolveLayoutGaps(): LayoutGaps {
  return {
    gap: BASE_GAP * NODE_SPACING,
    siblingGap: BASE_SIBLING_GAP * NODE_SPACING,
  };
}
