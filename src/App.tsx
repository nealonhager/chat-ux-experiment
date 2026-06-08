import { useEffect, useMemo, useRef, useState } from "react";

import type { ComposerProps } from "./types/chat";
import { ConversationFlow } from "./components/ConversationFlow";
import { RealtimeTranscriptionSession } from "./lib/realtimeTranscription";
import {
  COMPOSER_ROOT_ANCHOR,
  type ComposerAnchorId,
  resolveComposerAnchor,
} from "./lib/chatBubbleLayout";
import {
  addAssistantMessage,
  addUserMessage,
  updateAssistantMessageContent,
  updateAssistantMessageModel,
  clearConversation,
  getModelContext,
  loadConversationFromStorage,
  saveConversationToStorage,
  setActiveFromMessageClick,
  type ConversationTree,
} from "./lib/conversationTree";
import { readChatStream } from "./lib/chatStream";
import {
  CHAT_MODEL_STORAGE_KEY,
  getStoredChatModel,
  type ChatModelId,
} from "./lib/chatModels";
import { SpeechPlayer } from "./lib/speechSynthesis";
import {
  getStoredSpeechSpeed,
  getStoredSpeechStyle,
  getStoredTtsModel,
  clampSpeechSpeed,
  SPEECH_SPEED_STORAGE_KEY,
  SPEECH_STYLE_STORAGE_KEY,
  TTS_MODEL_STORAGE_KEY,
  type SpeechStyleId,
  type TtsModelId,
} from "./lib/speechSettings";
import {
  getStoredSpeechVoice,
  SPEECH_VOICE_STORAGE_KEY,
  type SpeechVoiceId,
} from "./lib/speechVoices";

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
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechVoiceId>(getStoredSpeechVoice);
  const [selectedTtsModel, setSelectedTtsModel] =
    useState<TtsModelId>(getStoredTtsModel);
  const [selectedSpeechStyle, setSelectedSpeechStyle] =
    useState<SpeechStyleId>(getStoredSpeechStyle);
  const [speechSpeed, setSpeechSpeed] = useState(getStoredSpeechSpeed);
  const [selectedModel, setSelectedModel] =
    useState<ChatModelId>(getStoredChatModel);
  const [isSpeechLoading, setIsSpeechLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const transcriptionSessionRef = useRef<RealtimeTranscriptionSession | null>(
    null
  );
  const resumeRecordingAfterReplyRef = useRef(false);
  const speechPlayerRef = useRef(new SpeechPlayer());
  const speechEnabledRef = useRef(speechEnabled);
  const speechOptionsRef = useRef({
    voice: selectedVoice,
    model: selectedTtsModel,
    style: selectedSpeechStyle,
    speed: speechSpeed,
  });
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
    speechOptionsRef.current = {
      voice: selectedVoice,
      model: selectedTtsModel,
      style: selectedSpeechStyle,
      speed: speechSpeed,
    };
  }, [selectedVoice, selectedTtsModel, selectedSpeechStyle, speechSpeed]);

  useEffect(() => {
    saveConversationToStorage(tree);
  }, [tree]);

  useEffect(() => {
    if (
      isSending ||
      !resumeRecordingAfterReplyRef.current ||
      composerAnchorId === null
    ) {
      return;
    }

    resumeRecordingAfterReplyRef.current = false;
    void startRecording();
  }, [isSending, composerAnchorId]);

  useEffect(() => {
    return () => {
      transcriptionSessionRef.current?.dispose();
      speechPlayerRef.current.stop();
    };
  }, []);

  async function speakResponse(text: string): Promise<void> {
    setIsSpeechLoading(true);
    setIsSpeaking(false);
    setErrorMessage("");

    try {
      await speechPlayerRef.current.speak(text, {
        ...speechOptionsRef.current,
        onAudioReady: () => {
          setIsSpeechLoading(false);
          setIsSpeaking(true);
        },
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to play speech."
      );
    } finally {
      setIsSpeechLoading(false);
      setIsSpeaking(false);
    }
  }

  function stopRecording(): void {
    resumeRecordingAfterReplyRef.current = false;
    setIsRecording(false);
    setIsConnecting(false);

    const session = transcriptionSessionRef.current;
    if (!session) {
      return;
    }

    transcriptionSessionRef.current = null;
    session.commitAndClose();
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

    const shouldResumeVoiceInput = Boolean(transcriptionSessionRef.current);
    if (shouldResumeVoiceInput) {
      stopRecording();
      resumeRecordingAfterReplyRef.current = true;
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
        body: JSON.stringify({ messages: payload, model: selectedModel }),
      });

      if (!response.ok) {
        throw new Error((await response.text()) || "Could not get a response.");
      }

      const assistantMessageId = crypto.randomUUID();
      let streamedContent = "";
      let responseModel: string | undefined;

      await readChatStream(response, (event) => {
        if (event.type === "error") {
          throw new Error(event.message);
        }

        if (event.type === "meta") {
          responseModel = event.model;
          setTree((current) => {
            if (!current.messages[assistantMessageId]) {
              return current;
            }

            return updateAssistantMessageModel(
              current,
              assistantMessageId,
              event.model
            );
          });
          return;
        }

        if (event.type === "delta") {
          streamedContent += event.delta;
          setTree((current) => {
            if (!current.messages[assistantMessageId]) {
              return addAssistantMessage(
                current,
                userMessage.id,
                streamedContent,
                assistantMessageId,
                responseModel
              ).tree;
            }

            return updateAssistantMessageContent(
              current,
              assistantMessageId,
              streamedContent
            );
          });
        }
      });

      if (!streamedContent.trim()) {
        throw new Error("The model returned an empty response.");
      }

      if (speechEnabledRef.current) {
        void speakResponse(streamedContent);
      }

      setSendAnchorId(null);
    } catch (error) {
      resumeRecordingAfterReplyRef.current = false;
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

  function handleModelChange(model: ChatModelId): void {
    setSelectedModel(model);
    localStorage.setItem(CHAT_MODEL_STORAGE_KEY, model);
  }

  function handleSpeechVoiceChange(voice: SpeechVoiceId): void {
    setSelectedVoice(voice);
    localStorage.setItem(SPEECH_VOICE_STORAGE_KEY, voice);
  }

  function handleTtsModelChange(model: TtsModelId): void {
    setSelectedTtsModel(model);
    localStorage.setItem(TTS_MODEL_STORAGE_KEY, model);
  }

  function handleSpeechStyleChange(style: SpeechStyleId): void {
    setSelectedSpeechStyle(style);
    localStorage.setItem(SPEECH_STYLE_STORAGE_KEY, style);
  }

  function handleSpeechSpeedChange(speed: number): void {
    const clamped = clampSpeechSpeed(speed);
    setSpeechSpeed(clamped);
    localStorage.setItem(SPEECH_SPEED_STORAGE_KEY, String(clamped));
  }

  function handleToggleSpeech(): void {
    setSpeechEnabled((current) => {
      const next = !current;
      localStorage.setItem(SPEECH_STORAGE_KEY, String(next));
      if (!next) {
        speechPlayerRef.current.stop();
        setIsSpeechLoading(false);
        setIsSpeaking(false);
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
          placeholder: composerPlaceholder,
          model: selectedModel,
          onChange: setInputValue,
          onModelChange: handleModelChange,
          onSend: (text) => void sendMessage(text),
          onToggleRecording: handleToggleRecording,
        }
      : null;

  return (
    <ConversationFlow
      tree={tree}
      composerAnchorId={composerAnchorId}
      composer={composerProps}
      isSending={isSending}
      thinkingParentId={thinkingParentId}
      errorMessage={errorMessage}
      onSelectMessage={handleSelectMessage}
      speechEnabled={speechEnabled}
      speechVoice={selectedVoice}
      ttsModel={selectedTtsModel}
      speechStyle={selectedSpeechStyle}
      speechSpeed={speechSpeed}
      isSpeechLoading={isSpeechLoading}
      isSpeaking={isSpeaking}
      onToggleSpeech={handleToggleSpeech}
      onSpeechVoiceChange={handleSpeechVoiceChange}
      onTtsModelChange={handleTtsModelChange}
      onSpeechStyleChange={handleSpeechStyleChange}
      onSpeechSpeedChange={handleSpeechSpeedChange}
      hasMessages={messageCount > 0}
      onClearConversation={handleClearConversation}
    />
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
