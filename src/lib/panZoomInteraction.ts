export const PAN_ZOOM_INTERACTIVE_SELECTOR = [
  "input",
  "textarea",
  "button",
  "select",
  "option",
  "a",
  "label",
  '[contenteditable="true"]',
  "[data-no-pan]",
  "[data-chat-bubble]",
  '[data-slot="select-trigger"]',
  '[data-slot="select-content"]',
  '[data-slot="select-item"]',
  '[role="listbox"]',
  '[role="option"]',
].join(", ");

const COMPOSER_INTERACTION_SELECTOR = [
  "textarea",
  "input",
  '[contenteditable="true"]',
  "[data-composer]",
  '[data-slot="select-trigger"]',
  '[data-slot="select-content"]',
  '[data-slot="select-item"]',
  '[role="listbox"]',
  '[role="option"]',
].join(", ");

export function isPanZoomInteractiveTarget(
  target: EventTarget | null
): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest(PAN_ZOOM_INTERACTIVE_SELECTOR));
}

export function isComposerInteractionTarget(
  target: EventTarget | null
): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest(COMPOSER_INTERACTION_SELECTOR));
}
