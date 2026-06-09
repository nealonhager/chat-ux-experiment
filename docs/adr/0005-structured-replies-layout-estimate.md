# Structured replies with markdown-aware layout estimates

Assistant Messages render as **Structured replies** — standard GFM markdown interpreted into headings, lists, emphasis, links, tables, and plain fenced code blocks. User Messages stay plain text. Replies format incrementally during a **Streaming reply**; wide tables and code blocks scroll horizontally inside the fixed-width bubble rather than widening it. In-reply links are sanitized, open in a new tab, and do not change the **Active node** when clicked. **Speech** strips markup before reading aloud.

Canvas positions are computed before render. Bubble height uses a **Layout estimate** derived from markdown structure — line breaks, list items, headings, fenced blocks — rather than raw character count alone.

We rejected **DOM-measured layout** (measuring rendered bubble height and feeding it back into tree positioning). It is more accurate on edge cases, but on this Canvas it would re-layout the tree on every stream delta, producing visible jumps as tokens arrive. The single-pass markdown-aware estimate keeps sibling and child positioning stable during streaming and avoids a ResizeObserver feedback loop through React Flow nodes.

Deferred from the first version: syntax-highlighted code blocks, copy buttons on code, math, and diagram rendering. DOM measurement remains a viable follow-up if overlap persists on long replies.

Domain terms and behavior: `CONTEXT.md`.
