# React Flow canvas for the conversation tree

The conversation tree is rendered with `@xyflow/react` instead of a custom pan-zoom layer and absolutely positioned bubbles. Chat messages are custom nodes; parent-child links are smoothstep edges. Layout positions still come from `chatBubbleLayout.ts` (origin-based coordinates, not a 20k×20k world); `conversationFlowLayout.ts` maps that layout to measured nodes and edges. The flow uses `useNodesState` / `onNodesChange` so React Flow can measure nodes, and `fitView` on load so the composer is actually on screen.

## Considered options

- **Custom pan-zoom + absolute bubbles** — Full control over layout and composer embedding, but reimplements pan, zoom, minimap navigation, and viewport sync that React Flow provides.
- **React Flow** — Node/edge model fits the tree; pan, zoom, minimap, and background are built in. Custom nodes carry the same bubble UI and embedded composer behavior.

## Consequences

- Dead code removed: `PanZoomLayer`, `PanZoomMinimap`, `PanZoomContext`, `ChatBubbles`, `DotGridBackground`, and pan-zoom interaction helpers.
- Layout constants live in `canvasLayout.ts`; tree layout logic stays in `chatBubbleLayout.ts`.
