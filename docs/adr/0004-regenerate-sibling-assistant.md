# Regenerate adds a sibling assistant, not a replacement

Regenerate requests a new assistant answer under the **same user message**, optionally with a different model. The prior assistant answer stays in the tree as a sibling branch. After a successful Regenerate, the active node moves to the new answer — same as Continue after a send. The control lives on assistant bubbles only; **Retry** after a failed reply still goes through the Composer at the send anchor.

We rejected **replacing** the assistant in place because it deletes the answer the user rejected and contradicts the tree’s purpose: exploring alternatives without losing history (see ADR 0001). We rejected **soft-replace** (hide the old answer, keep it in storage) because it adds collapse/visibility rules without the honest side-by-side comparison the canvas already supports. We rejected putting Regenerate on **user bubbles** because user bubbles are non-interactive; the action is a reaction to a specific answer, and the assistant bubble already carries model attribution.

Regenerate is distinct from **Fork**: Fork adds a sibling **user** message (new prompt via the Composer); Regenerate adds a sibling **assistant** message (same prompt, new completion). If the regenerated assistant already has children, that subtree stays on the old answer; the new sibling starts as a bare tip. Only one completion (send or Regenerate) may be in flight at a time. On failure, no new sibling is added and the active node is unchanged.

Domain terms and behavior: `CONTEXT.md`.
