import { type Edge, type Node, Position } from "@xyflow/react";

import {
  type ComposerAnchorId,
  getCanvasLayoutFromTree,
} from "@/lib/chatBubbleLayout";
import type { ConversationTree } from "@/lib/conversationTree";

export const CHAT_NODE_TYPE = "chatBubble" as const;
export const CONVERSATION_EDGE_TYPE = "conversation" as const;

export type ConversationEdgeData = {
  sourcePoint: { x: number; y: number };
  targetPoint: { x: number; y: number };
};

export type ChatBubbleNodeData = {
  role: "user" | "assistant" | "thinking";
  content: string;
  messageId?: string;
  model?: string;
  createdAt?: string;
  isActive: boolean;
  showComposer: boolean;
  width: number;
  minHeight: number;
};

export type ConversationFlowNode = Node<
  ChatBubbleNodeData,
  typeof CHAT_NODE_TYPE
>;

type BuildConversationFlowGraphOptions = {
  isSending?: boolean;
  thinkingParentId?: string | null;
  composerAnchorId?: ComposerAnchorId | null;
};

export function buildConversationFlowGraph(
  tree: ConversationTree,
  options: BuildConversationFlowGraphOptions = {}
): { nodes: ConversationFlowNode[]; edges: Edge[] } {
  const layout = getCanvasLayoutFromTree(tree, options);
  const { bubbles } = layout;
  const composerAnchorId = options.composerAnchorId ?? null;

  const nodes: ConversationFlowNode[] = bubbles.map((bubble) => {
    if (bubble.role === "thinking") {
      return {
        id: bubble.id,
        type: CHAT_NODE_TYPE,
        position: { x: bubble.x, y: bubble.y },
        width: bubble.width,
        height: bubble.height,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          role: "thinking",
          content: "Thinking...",
          isActive: false,
          showComposer: false,
          width: bubble.width,
          minHeight: bubble.height,
        },
        draggable: false,
        selectable: false,
      };
    }

    const message = tree.messages[bubble.id];
    const isActive = tree.activeNodeId === bubble.id;
    const showComposer =
      message?.role === "assistant" && composerAnchorId === message.id;

    return {
      id: bubble.id,
      type: CHAT_NODE_TYPE,
      position: { x: bubble.x, y: bubble.y },
      width: bubble.width,
      height: bubble.height,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        role: message?.role ?? "assistant",
        content: message?.content ?? "",
        messageId: message?.id,
        model: message?.role === "assistant" ? message.model : undefined,
        createdAt: message?.createdAt,
        isActive,
        showComposer,
        width: bubble.width,
        minHeight: bubble.height,
      },
      draggable: false,
      selectable: message?.role === "assistant",
    };
  });

  const bubbleById = new Map(bubbles.map((bubble) => [bubble.id, bubble]));

  const edges: Edge[] = bubbles.flatMap((bubble) => {
    if (!bubble.parentId) {
      return [];
    }

    const parent = bubbleById.get(bubble.parentId);
    if (!parent) {
      return [];
    }

    return [
      {
        id: `${bubble.parentId}-${bubble.id}`,
        source: bubble.parentId,
        target: bubble.id,
        type: CONVERSATION_EDGE_TYPE,
        data: {
          sourcePoint: {
            x: parent.x + parent.width / 2,
            y: parent.y + parent.height,
          },
          targetPoint: {
            x: bubble.x + bubble.width / 2,
            y: bubble.y,
          },
        } satisfies ConversationEdgeData,
        selectable: false,
        focusable: false,
      },
    ];
  });

  return { nodes, edges };
}
