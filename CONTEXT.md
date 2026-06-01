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
The assistant message the user is currently working from; shown with a distinct border on the canvas. Clicking an assistant sets it active; clicking a user message activates its parent assistant instead.
_Avoid_: Active tip, focus, cursor, selected message

**Composer**:
The single text/voice input used to send a new user message as a child of the active node (a new sibling branch when that assistant already has children).
_Avoid_: Thread input, main input, prompt bar

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
With no assistant messages yet, there is no active node; the first composer send creates a root user message, then Continue sets the active node on the first assistant reply.
_Avoid_: New chat, empty state

**Viewport**:
When the active node changes, the canvas pans only if that message is not already visible.
_Avoid_: Auto-scroll, follow mode

**Clear conversation**:
The user can wipe the current conversation and start over; individual branches cannot be deleted in the first version.
_Avoid_: Delete message, prune, remove branch

**Failed reply**:
If the model request fails after the user sends, the user message remains in the tree with no assistant child; the active node stays on the prior assistant so the user can retry.
_Avoid_: Rollback, undo send
