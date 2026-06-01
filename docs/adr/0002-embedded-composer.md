# Composer is embedded in the active assistant bubble on the canvas

The single Composer no longer lives in a viewport-fixed bar. At Start it is a UI-only root slot styled like a user bubble; once assistants exist it embeds inside the active assistant bubble (content → Composer → actions). Layout expands that bubble and shifts children down instantly. We rejected a viewport-fixed Composer because it broke the canvas metaphor, and rejected a floating overlay below the active node because it obscured existing branches without participating in layout.

Per-anchor drafts live in memory only (not persisted). Global chrome is limited to Clear conversation; selection is shown only by the active-node border.

Domain terms: `CONTEXT.md`.
