import { type ChatMessage } from "@/components/ChatBubbles";
import type { ConversationTree } from "@/lib/conversationTree";
import { getChildren } from "@/lib/conversationTree";
import { CHAT_COLUMN_WIDTH, type WorldRect, WORLD_SIZE } from "@/lib/panZoom";

export const CHAT_LAYOUT = {
  paddingX: 16,
  paddingTop: 32,
  gap: 16,
  siblingGap: 24,
  bubblePaddingX: 16,
  bubblePaddingY: 12,
  fontSize: 14,
  lineHeight: 20,
  minBubbleHeight: 44,
  /** Action row + divider below assistant text */
  assistantActionsHeight: 52,
  /** border-2 and active ring-offset slack */
  chromeSlack: 8,
} as const;

export type MinimapBubble = WorldRect & {
  id: string;
  role: "user" | "assistant" | "thinking";
  parentId: string | null;
};

function getBubbleContentWidth(bubbleWidth: number): number {
  return bubbleWidth - CHAT_LAYOUT.bubblePaddingX * 2;
}

function estimateBubbleHeight(
  content: string,
  bubbleWidth: number,
  role: ChatMessage["role"]
): number {
  const charsPerLine = Math.max(
    20,
    Math.floor(getBubbleContentWidth(bubbleWidth) / 6.5)
  );
  const lines = Math.max(1, Math.ceil(content.length / charsPerLine));
  const textHeight = lines * CHAT_LAYOUT.lineHeight;
  let height =
    CHAT_LAYOUT.bubblePaddingY * 2 + textHeight + CHAT_LAYOUT.chromeSlack;

  if (role === "assistant") {
    height += CHAT_LAYOUT.assistantActionsHeight;
  }

  return Math.max(CHAT_LAYOUT.minBubbleHeight, height);
}

function getSubtreeBottom(node: LayoutNode): number {
  let bottom = node.y + node.height;
  for (const child of node.children) {
    bottom = Math.max(bottom, getSubtreeBottom(child));
  }
  return bottom;
}

type LayoutNode = {
  message: ChatMessage;
  children: LayoutNode[];
  width: number;
  height: number;
  x: number;
  y: number;
};

function buildLayoutForest(tree: ConversationTree): LayoutNode[] {
  function buildNode(message: ChatMessage): LayoutNode {
    const childMessages = getChildren(tree, message.id).sort((a, b) =>
      a.id.localeCompare(b.id)
    );
    return {
      message,
      children: childMessages.map(buildNode),
      width: 0,
      height: 0,
      x: 0,
      y: 0,
    };
  }

  const roots = Object.values(tree.messages)
    .filter((message) => message.parentId === null)
    .sort((a, b) => a.id.localeCompare(b.id));

  return roots.map(buildNode);
}

function assignPositions(
  nodes: LayoutNode[],
  bubbleWidth: number,
  startY: number,
  startX: number
): number {
  let cursorX = startX;

  function layoutNode(node: LayoutNode, parentBottom: number): number {
    node.height = estimateBubbleHeight(
      node.message.content,
      bubbleWidth,
      node.message.role
    );
    node.width = bubbleWidth;
    node.y = parentBottom === -1 ? startY : parentBottom + CHAT_LAYOUT.gap;

    if (node.children.length === 0) {
      node.x = cursorX;
      cursorX += bubbleWidth + CHAT_LAYOUT.siblingGap;
      return node.y + node.height;
    }

    let subtreeBottom = node.y + node.height;

    if (node.children.length === 1) {
      subtreeBottom = layoutNode(node.children[0], subtreeBottom);
    } else {
      const childTop = node.y + node.height;
      for (const child of node.children) {
        layoutNode(child, childTop);
        subtreeBottom = Math.max(subtreeBottom, getSubtreeBottom(child));
      }
    }

    const firstChild = node.children[0];
    const lastChild = node.children[node.children.length - 1];
    const childrenSpanCenter =
      (firstChild.x + lastChild.x + lastChild.width) / 2;
    node.x = childrenSpanCenter - bubbleWidth / 2;

    return subtreeBottom;
  }

  for (const root of nodes) {
    layoutNode(root, -1);
  }

  return cursorX;
}

function flattenLayoutNodes(nodes: LayoutNode[]): LayoutNode[] {
  const flat: LayoutNode[] = [];

  function visit(node: LayoutNode): void {
    flat.push(node);
    for (const child of node.children) {
      visit(child);
    }
  }

  for (const root of nodes) {
    visit(root);
  }

  return flat;
}

export function getBubbleWorldRectsFromTree(
  tree: ConversationTree,
  isSending = false,
  thinkingParentId?: string | null
): MinimapBubble[] {
  const bubbleWidth = CHAT_COLUMN_WIDTH - CHAT_LAYOUT.paddingX * 2;
  const forest = buildLayoutForest(tree);
  if (forest.length === 0 && !isSending) {
    return [];
  }

  assignPositions(
    forest,
    bubbleWidth,
    CHAT_LAYOUT.paddingTop,
    (WORLD_SIZE - CHAT_COLUMN_WIDTH) / 2 + CHAT_LAYOUT.paddingX
  );

  const placed = flattenLayoutNodes(forest);
  const bubbles: MinimapBubble[] = placed.map((node) => ({
    id: node.message.id,
    role: node.message.role,
    parentId: node.message.parentId,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  }));

  if (isSending) {
    const parentMessageId = thinkingParentId ?? null;
    const pendingParent = parentMessageId
      ? bubbles.find((bubble) => bubble.id === parentMessageId)
      : undefined;

    const height = estimateBubbleHeight(
      "Thinking...",
      bubbleWidth,
      "assistant"
    );
    const width = bubbleWidth * 0.88;
    const x = pendingParent
      ? pendingParent.x + (pendingParent.width - width) / 2
      : (WORLD_SIZE - width) / 2;
    const y = pendingParent
      ? pendingParent.y + pendingParent.height + CHAT_LAYOUT.gap
      : CHAT_LAYOUT.paddingTop;

    bubbles.push({
      id: "thinking",
      role: "thinking",
      parentId: pendingParent?.id ?? null,
      x,
      y,
      width,
      height,
    });
  }

  return bubbles;
}

/** @deprecated Use getBubbleWorldRectsFromTree for tree-shaped conversations. */
export function getBubbleWorldRects(
  messages: ChatMessage[],
  isSending = false
): MinimapBubble[] {
  const tree: ConversationTree = {
    messages: Object.fromEntries(
      messages.map((message) => [message.id, message])
    ),
    activeNodeId: null,
  };
  return getBubbleWorldRectsFromTree(tree, isSending);
}

export type ThreadSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export function getBubbleThreadSegments(
  bubbles: MinimapBubble[]
): ThreadSegment[] {
  const bubbleById = new Map(bubbles.map((bubble) => [bubble.id, bubble]));
  const segments: ThreadSegment[] = [];

  for (const bubble of bubbles) {
    if (!bubble.parentId || bubble.role === "thinking") {
      continue;
    }

    const parent = bubbleById.get(bubble.parentId);
    if (!parent) {
      continue;
    }

    segments.push({
      x1: parent.x + parent.width / 2,
      y1: parent.y + parent.height,
      x2: bubble.x + bubble.width / 2,
      y2: bubble.y,
    });
  }

  return segments;
}
