import { useEffect, useMemo, useRef, useState } from "react";

import { ChatBubbles, type ComposerProps } from "./components/ChatBubbles";
import { DotGridBackground } from "./components/DotGridBackground";
import { PanZoomLayer } from "./components/PanZoomLayer";
import { RealtimeTranscriptionSession } from "./lib/realtimeTranscription";
import {
  COMPOSER_ROOT_ANCHOR,
  type ComposerAnchorId,
  resolveComposerAnchor,
} from "./lib/chatBubbleLayout";
import {
  addAssistantMessage,
  addUserMessage,
  clearConversation,
  forkConversation,
  getModelContext,
  loadConversationFromStorage,
  saveConversationToStorage,
  setActiveFromMessageClick,
  type ConversationTree,
} from "./lib/conversationTree";
import { SpeechPlayer } from "./lib/speechSynthesis";

type ChatMessagePayload = {
  role: "user" | "assistant";
  content: string;
};

const SPEECH_STORAGE_KEY = "gpt-chat-speech-enabled";

function getStoredSpeechEnabled(): boolean {
  return localStorage.getItem(SPEECH_STORAGE_KEY) === "true";
}

function App() {
  const [tree, setTree] = useState<ConversationTree>(
    loadConversationFromStorage
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sendAnchorId, setSendAnchorId] = useState<ComposerAnchorId | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [thinkingParentId, setThinkingParentId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(getStoredSpeechEnabled);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(
    null
  );

  const transcriptionSessionRef = useRef<RealtimeTranscriptionSession | null>(
    null
  );
  const speechPlayerRef = useRef(new SpeechPlayer());
  const speechEnabledRef = useRef(speechEnabled);
  const transcriptionBaseRef = useRef("");

  const messageCount = useMemo(
    () => Object.keys(tree.messages).length,
    [tree.messages]
  );

  const composerAnchorId = useMemo(
    () => resolveComposerAnchor(tree, messageCount, sendAnchorId),
    [tree, messageCount, sendAnchorId]
  );

  const inputValue =
    composerAnchorId !== null ? (drafts[composerAnchorId] ?? "") : "";

  function setInputValue(value: string): void {
    if (composerAnchorId === null) {
      return;
    }

    setDrafts((current) => ({
      ...current,
      [composerAnchorId]: value,
    }));
  }

  function clearDraft(anchorId: ComposerAnchorId): void {
    setDrafts((current) => {
      const next = { ...current };
      delete next[anchorId];
      return next;
    });
  }

  useEffect(() => {
    speechEnabledRef.current = speechEnabled;
  }, [speechEnabled]);

  useEffect(() => {
    saveConversationToStorage(tree);
  }, [tree]);

  useEffect(() => {
    return () => {
      transcriptionSessionRef.current?.dispose();
      speechPlayerRef.current.stop();
    };
  }, []);

  async function speakResponse(
    text: string,
    messageId?: string
  ): Promise<void> {
    setIsSpeaking(true);
    setSpeakingMessageId(messageId ?? null);
    setErrorMessage("");

    try {
      await speechPlayerRef.current.speak(text);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to play speech."
      );
    } finally {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  }

  function stopRecording(): void {
    setIsRecording(false);
    setIsConnecting(false);

    const session = transcriptionSessionRef.current;
    if (!session) {
      return;
    }

    transcriptionSessionRef.current = null;
    session.commitAndClose();
  }

  function handleFork(messageId: string): void {
    if (isRecording || isConnecting) {
      stopRecording();
    }
    setTree((current) => forkConversation(current, messageId));
    setErrorMessage("");
  }

  function handleSelectMessage(messageId: string): void {
    if (
      (isRecording || isConnecting) &&
      composerAnchorId !== null &&
      composerAnchorId !== messageId
    ) {
      stopRecording();
    }
    setTree((current) => setActiveFromMessageClick(current, messageId));
    setErrorMessage("");
  }

  async function handleCopy(content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to copy message."
      );
    }
  }

  function handleSpeakMessage(messageId: string, content: string): void {
    speechPlayerRef.current.stop();
    void speakResponse(content, messageId);
  }

  function handleClearConversation(): void {
    if (transcriptionSessionRef.current) {
      stopRecording();
    }
    setTree(clearConversation());
    setDrafts({});
    setSendAnchorId(null);
    setErrorMessage("");
    setThinkingParentId(null);
  }

  async function sendMessage(text: string): Promise<void> {
    const trimmedText = text.trim();
    if (!trimmedText || isSending || composerAnchorId === null) {
      return;
    }

    if (
      tree.activeNodeId === null &&
      messageCount > 0 &&
      sendAnchorId === null
    ) {
      setErrorMessage("Select an assistant message on the canvas to continue.");
      return;
    }

    if (transcriptionSessionRef.current) {
      stopRecording();
    }

    const anchorForSend = composerAnchorId;
    setSendAnchorId(tree.activeNodeId ?? COMPOSER_ROOT_ANCHOR);

    const { tree: treeWithUser, userMessage } = addUserMessage(
      tree,
      trimmedText
    );
    setTree(treeWithUser);
    clearDraft(anchorForSend);
    setThinkingParentId(userMessage.id);
    transcriptionBaseRef.current = "";
    setErrorMessage("");
    setIsSending(true);

    try {
      const payload: ChatMessagePayload[] = getModelContext(
        treeWithUser,
        userMessage
      );

      const response = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload }),
      });

      if (!response.ok) {
        throw new Error((await response.text()) || "Could not get a response.");
      }

      const data = (await response.json()) as { content: string };
      setTree((current) =>
        addAssistantMessage(current, userMessage.id, data.content)
      );
      setSendAnchorId(null);

      if (speechEnabledRef.current) {
        void speakResponse(data.content);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to send message."
      );
    } finally {
      setIsSending(false);
      setThinkingParentId(null);
    }
  }

  async function startRecording(): Promise<void> {
    if (composerAnchorId === null) {
      return;
    }

    setErrorMessage("");
    setIsConnecting(true);
    transcriptionBaseRef.current = inputValue;

    let session: RealtimeTranscriptionSession | null = null;
    session = new RealtimeTranscriptionSession({
      onConnected: () => {
        if (transcriptionSessionRef.current !== session) {
          return;
        }
        setIsConnecting(false);
        setIsRecording(true);
      },
      onDelta: (_delta, draft) => {
        if (transcriptionSessionRef.current !== session) {
          return;
        }
        setInputValue(joinText(transcriptionBaseRef.current, draft));
      },
      onCompleted: (transcript) => {
        if (transcriptionSessionRef.current !== session) {
          return;
        }
        transcriptionBaseRef.current = joinText(
          transcriptionBaseRef.current,
          transcript
        );
        setInputValue(transcriptionBaseRef.current);
      },
      onError: (message) => {
        if (transcriptionSessionRef.current !== session) {
          return;
        }
        setErrorMessage(message);
      },
    });

    transcriptionSessionRef.current = session;

    try {
      await session.start();
    } catch (error) {
      if (transcriptionSessionRef.current === session) {
        transcriptionSessionRef.current = null;
      }
      session.dispose();
      setIsConnecting(false);
      setIsRecording(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Could not access microphone."
      );
    }
  }

  function handleToggleRecording(): void {
    if (isSending || composerAnchorId === null) {
      return;
    }

    if (isRecording || isConnecting) {
      stopRecording();
      return;
    }

    void startRecording();
  }

  function handleToggleSpeech(): void {
    setSpeechEnabled((current) => {
      const next = !current;
      localStorage.setItem(SPEECH_STORAGE_KEY, String(next));
      if (!next) {
        speechPlayerRef.current.stop();
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      }
      return next;
    });
  }

  const composerPlaceholder =
    composerAnchorId === COMPOSER_ROOT_ANCHOR
      ? "Start conversation..."
      : "Send to continue from the active assistant…";

  const composerProps: ComposerProps | null =
    composerAnchorId !== null
      ? {
          value: inputValue,
          disabled: isSending,
          isRecording,
          isTranscribing: isConnecting,
          speechEnabled,
          isSpeaking,
          placeholder: composerPlaceholder,
          onChange: setInputValue,
          onSend: (text) => void sendMessage(text),
          onToggleRecording: handleToggleRecording,
          onToggleSpeech: handleToggleSpeech,
        }
      : null;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <PanZoomLayer
        tree={tree}
        minimapIsSending={isSending}
        thinkingParentId={thinkingParentId}
      >
        <DotGridBackground />
        <ChatBubbles
          tree={tree}
          composerAnchorId={composerAnchorId}
          composer={composerProps}
          isSending={isSending}
          thinkingParentId={thinkingParentId}
          errorMessage={errorMessage}
          speakingMessageId={speakingMessageId}
          onFork={handleFork}
          onCopy={(content) => void handleCopy(content)}
          onSpeak={handleSpeakMessage}
          onSelectMessage={handleSelectMessage}
        />
      </PanZoomLayer>

      {messageCount > 0 ? (
        <button
          type="button"
          onClick={handleClearConversation}
          className="pointer-events-auto fixed bottom-4 right-4 z-50 rounded-md border border-input bg-card/95 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur transition-colors hover:bg-muted"
        >
          Clear conversation
        </button>
      ) : null}
    </div>
  );
}

function joinText(base: string, addition: string): string {
  const trimmedBase = base.trim();
  const trimmedAddition = addition.trim();
  if (!trimmedAddition) {
    return trimmedBase;
  }
  if (!trimmedBase) {
    return trimmedAddition;
  }
  return `${trimmedBase} ${trimmedAddition}`;
}

export default App;
