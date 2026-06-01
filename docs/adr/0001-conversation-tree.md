# Conversation state is a tree, not a linear transcript

The chat UI stores messages as a parent-linked tree (`ConversationTree`), not a flat array that gets truncated on fork. Forking creates a sibling branch under an assistant message; earlier branches remain in the conversation and on the canvas. The model receives only the path from the single root to the active assistant, plus the new user message — sibling branches are excluded.

We rejected keeping a linear `messages[]` with `slice()` on fork because that deletes abandoned paths and contradicts “explore alternatives from the same answer.” We rejected sending the full tree to the model because chat completions expect one transcript and sibling prompts would pollute context.

Domain terms and behavior live in `CONTEXT.md` at the repo root.
