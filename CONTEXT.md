# GPT Realtime Chat

A voice-and-text chat demo where the user explores multiple continuations from the same assistant reply.

## Language

**Conversation**:
The full tree of user and assistant messages for one chat session, including every branch, with a single root user message.
_Avoid_: Thread (reserved for a single path), Session, multiple topics

**Fork**:
Starting a new sibling branch from an assistant message while keeping earlier branches; sets that assistant as the active node for the next composer send. Available on any assistant answer in the tree.
_Avoid_: Rewind, truncate, reset

**Message**:
One user or assistant utterance in the conversation tree, with a parent link to the prior message (except roots).
_Avoid_: Node (implementation), Turn

**Branch**:
A path from a root message through parent links to a tip message; sibling branches share the same fork point.
_Avoid_: Thread, timeline

**Canvas**:
The pan-zoom surface where the entire conversation tree is laid out and visible at once.
_Avoid_: Viewport, board, workspace

**Active node**:
The assistant message the user is currently working from; shown with a distinct ring on the canvas. Only assistant bubbles are clickable to set the active node; user bubbles are not interactive.
_Avoid_: Active tip, focus, cursor, selected message

**Composer**:
The single text/voice input used to send a new user message as a child of the active node (a new sibling branch when that assistant already has children). When an assistant is active, the Composer is embedded at the bottom of that assistant bubble — not a separate bubble. At Start, before any messages exist, the Composer is a UI-only slot at the root — not a Message until the user sends. Each send anchor (root slot or active assistant) keeps its own draft text in memory; switching active node restores that anchor’s draft. Drafts are not persisted — reload clears them. Switching active node while voice recording stops the recording; any partial transcript stays in the previous anchor’s draft.
_Avoid_: Thread input, main input, prompt bar, composer bubble, shared draft

**Model context**:
The messages sent to the model for a completion: the path from a root to the active node, plus the new user message. Sibling branches are not included.
_Avoid_: Full tree context, transcript

**Continue**:
After the model replies, the active node moves to that new assistant message so the user can keep going on the same branch.
_Avoid_: Auto-select, follow

**Persistence**:
The conversation tree and active node are saved in browser storage and restored when the app loads.
_Avoid_: Sync, cloud save, session

**Conversation store**:
Browser storage holds one or more conversations in an extensible shape (list + active id); the UI starts with a single conversation.
_Avoid_: Database, chat history API

**Tree layout**:
On the canvas, depth flows downward and sibling branches spread horizontally from the same fork point.
_Avoid_: Column layout, mind map

**Start**:
With no messages yet, the Composer appears on the canvas as a root slot (not viewport-fixed). The first send creates the root user message from that input; Continue sets the active node on the first assistant reply.
_Avoid_: New chat, empty state

**Composer placement**:
When an assistant is the active node, the Composer lives inside that bubble — below the message content and above the action row (copy). Layout expands the active bubble to fit the Composer; existing children shift down instantly when the active node changes (no animation). At Start, the Composer is a standalone root slot on the canvas until the first send creates the root user message.
_Avoid_: Fixed prompt bar, docked input, separate composer bubble below active node

**Orphaned tree**:
Not a normal UI state. Can only occur when restored storage has messages but no valid active assistant. The Composer is hidden until the user clicks an assistant bubble. Once an assistant exists, Continue and fork keep an active node set — the user cannot deselect.
_Avoid_: No selection, lost focus, click-to-deselect

**Send anchor**:
The active assistant bubble that contained the Composer when the user last sent. While a reply is in flight, or after a failed reply with no assistant child yet, the Composer stays in that bubble (root slot on the first message; inside the prior active assistant on later sends) so the user can retry without reselecting.
_Avoid_: Pending parent, draft position

**Chrome**:
Global actions (e.g. Clear conversation) live in the minimap panel below the speech toggle. The Composer and conversation content live on the canvas. Active selection is shown only by the active node ring — no duplicate “Active: …” label on screen.
_Avoid_: HUD, status bar, docked prompt

**Viewport**:
When the active node changes, the canvas pans only if the active assistant bubble (including its embedded Composer) is not fully visible.
_Avoid_: Auto-scroll, follow mode

**Clear conversation**:
The user can wipe the current conversation and start over; individual branches cannot be deleted in the first version.
_Avoid_: Delete message, prune, remove branch

**Failed reply**:
If the model request fails after the user sends, the user message remains in the tree with no assistant child. The Composer stays in the send anchor so the user can retry — the root slot on the first message, or inside the prior active assistant on later sends.
_Avoid_: Rollback, undo send
