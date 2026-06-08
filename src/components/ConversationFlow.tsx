import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type EdgeTypes,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { ComposerProps } from "@/types/chat";
import { ConversationFlowProvider } from "@/components/ConversationFlowProvider";
import { ConversationEdge } from "@/components/edges/ConversationEdge";
import { FlowChromePanel } from "@/components/FlowChromePanel";
import { ChatBubbleNode } from "@/components/nodes/ChatBubbleNode";
import { RootComposerOverlay } from "@/components/RootComposerOverlay";
import { dotGridConfig } from "@/config/dotGrid";
import {
  COMPOSER_ROOT_ANCHOR,
  type ComposerAnchorId,
  getCanvasLayoutFromTree,
} from "@/lib/chatBubbleLayout";
import { buildConversationFlowGraph } from "@/lib/conversationFlowLayout";
import type { ConversationTree } from "@/lib/conversationTree";
import type { WorldRect } from "@/lib/canvasLayout";
import type { SpeechStyleId, TtsModelId } from "@/lib/speechSettings";
import type { SpeechVoiceId } from "@/lib/speechVoices";

const nodeTypes: NodeTypes = {
  chatBubble: ChatBubbleNode,
};

const edgeTypes: EdgeTypes = {
  conversation: ConversationEdge,
};

type ConversationFlowProps = {
  tree: ConversationTree;
  composerAnchorId: ComposerAnchorId | null;
  composer: ComposerProps | null;
  isSending?: boolean;
  thinkingParentId?: string | null;
  errorMessage?: string;
  onSelectMessage?: (messageId: string) => void;
  speechEnabled?: boolean;
  speechVoice?: SpeechVoiceId;
  ttsModel?: TtsModelId;
  speechStyle?: SpeechStyleId;
  speechSpeed?: number;
  isSpeechLoading?: boolean;
  isSpeaking?: boolean;
  onToggleSpeech?: () => void;
  onSpeechVoiceChange?: (voice: SpeechVoiceId) => void;
  onTtsModelChange?: (model: TtsModelId) => void;
  onSpeechStyleChange?: (style: SpeechStyleId) => void;
  onSpeechSpeedChange?: (speed: number) => void;
  hasMessages?: boolean;
  onClearConversation?: () => void;
};

function getVisibleFlowRect(
  viewport: { x: number; y: number; zoom: number },
  viewportWidth: number,
  viewportHeight: number
): WorldRect {
  const { x, y, zoom } = viewport;
  return {
    x: -x / zoom,
    y: -y / zoom,
    width: viewportWidth / zoom,
    height: viewportHeight / zoom,
  };
}

function isRectVisible(focusRect: WorldRect, visibleRect: WorldRect): boolean {
  return (
    focusRect.x + focusRect.width > visibleRect.x &&
    focusRect.x < visibleRect.x + visibleRect.width &&
    focusRect.y + focusRect.height > visibleRect.y &&
    focusRect.y < visibleRect.y + visibleRect.height
  );
}

function ViewportController({
  composerAnchorId,
  focusRect,
}: {
  composerAnchorId: ComposerAnchorId | null;
  focusRect: WorldRect | null;
}) {
  const { setCenter, getZoom, getViewport } = useReactFlow();
  const prevComposerAnchorIdRef = useRef(composerAnchorId);

  useEffect(() => {
    const anchorChanged = prevComposerAnchorIdRef.current !== composerAnchorId;
    prevComposerAnchorIdRef.current = composerAnchorId;

    if (!anchorChanged || composerAnchorId === null || !focusRect) {
      return;
    }

    const viewport = getViewport();
    const visibleRect = getVisibleFlowRect(
      viewport,
      window.innerWidth,
      window.innerHeight
    );

    if (!isRectVisible(focusRect, visibleRect)) {
      setCenter(
        focusRect.x + focusRect.width / 2,
        focusRect.y + focusRect.height / 2,
        { zoom: getZoom(), duration: 200 }
      );
    }
  }, [composerAnchorId, focusRect, getViewport, getZoom, setCenter]);

  return null;
}

function EmptyStateViewport({
  composerSlot,
  hasFlowNodes,
}: {
  composerSlot: WorldRect | null;
  hasFlowNodes: boolean;
}) {
  const { setCenter } = useReactFlow();

  useLayoutEffect(() => {
    if (hasFlowNodes || !composerSlot) {
      return;
    }

    setCenter(
      composerSlot.x + composerSlot.width / 2,
      composerSlot.y + composerSlot.height / 2,
      { zoom: 1, duration: 0 }
    );
  }, [composerSlot, hasFlowNodes, setCenter]);

  return null;
}

function ConversationFlowCanvas({
  tree,
  composerAnchorId,
  composer,
  isSending = false,
  thinkingParentId = null,
  errorMessage = "",
  onSelectMessage,
  speechEnabled,
  speechVoice,
  ttsModel,
  speechStyle,
  speechSpeed,
  isSpeechLoading,
  isSpeaking,
  onToggleSpeech,
  onSpeechVoiceChange,
  onTtsModelChange,
  onSpeechStyleChange,
  onSpeechSpeedChange,
  hasMessages,
  onClearConversation,
}: ConversationFlowProps) {
  const layoutOptions = useMemo(
    () => ({
      isSending,
      thinkingParentId,
      composerAnchorId,
    }),
    [isSending, thinkingParentId, composerAnchorId]
  );

  const layout = useMemo(
    () => getCanvasLayoutFromTree(tree, layoutOptions),
    [tree, layoutOptions]
  );

  const graph = useMemo(
    () => buildConversationFlowGraph(tree, layoutOptions),
    [tree, layoutOptions]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useLayoutEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  const showRootComposer =
    composerAnchorId === COMPOSER_ROOT_ANCHOR &&
    composer !== null &&
    layout.composerSlot;

  const focusRect = useMemo(() => {
    if (composerAnchorId === null) {
      return null;
    }

    if (composerAnchorId === COMPOSER_ROOT_ANCHOR) {
      return layout.composerSlot;
    }

    return (
      layout.bubbles.find((bubble) => bubble.id === composerAnchorId) ?? null
    );
  }, [composerAnchorId, layout.bubbles, layout.composerSlot]);

  return (
    <ConversationFlowProvider
      composer={composer}
      onSelectMessage={onSelectMessage}
    >
      <div className="relative h-screen w-screen overflow-hidden bg-gray-50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: "conversation" }}
          fitView={nodes.length > 0}
          fitViewOptions={{ padding: 0.3, maxZoom: 1.25 }}
          minZoom={0.1}
          maxZoom={4}
          panOnScroll
          zoomOnScroll
          zoomOnPinch
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={dotGridConfig.spacing}
            size={dotGridConfig.dotSize}
            color={dotGridConfig.color}
          />
          <EmptyStateViewport
            composerSlot={layout.composerSlot}
            hasFlowNodes={nodes.length > 0}
          />
          <ViewportController
            composerAnchorId={composerAnchorId}
            focusRect={focusRect}
          />
          {showRootComposer ? (
            <RootComposerOverlay slot={layout.composerSlot!} />
          ) : null}
          <FlowChromePanel
            rootComposerSlot={
              composerAnchorId === COMPOSER_ROOT_ANCHOR
                ? layout.composerSlot
                : null
            }
            speechEnabled={speechEnabled}
            speechVoice={speechVoice}
            ttsModel={ttsModel}
            speechStyle={speechStyle}
            speechSpeed={speechSpeed}
            isSpeechLoading={isSpeechLoading}
            isSpeaking={isSpeaking}
            onToggleSpeech={onToggleSpeech}
            onSpeechVoiceChange={onSpeechVoiceChange}
            onTtsModelChange={onTtsModelChange}
            onSpeechStyleChange={onSpeechStyleChange}
            onSpeechSpeedChange={onSpeechSpeedChange}
            hasMessages={hasMessages}
            onClearConversation={onClearConversation}
          />
        </ReactFlow>
        {errorMessage ? (
          <p className="pointer-events-none absolute left-1/2 top-8 z-50 w-full max-w-md -translate-x-1/2 px-4 text-center text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </ConversationFlowProvider>
  );
}

export function ConversationFlow(props: ConversationFlowProps) {
  return (
    <ReactFlowProvider>
      <ConversationFlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
