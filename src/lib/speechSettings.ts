export const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";

export const TTS_MODELS = [
  {
    id: "gpt-4o-mini-tts",
    label: "GPT-4o mini TTS",
    supportsInstructions: true,
  },
  { id: "tts-1", label: "TTS-1 (fast)", supportsInstructions: false },
  { id: "tts-1-hd", label: "TTS-1 HD", supportsInstructions: false },
] as const;

export type TtsModelId = (typeof TTS_MODELS)[number]["id"];

export const TTS_MODEL_ITEMS = TTS_MODELS.map((entry) => ({
  value: entry.id,
  label: entry.label,
}));

export const TTS_MODEL_STORAGE_KEY = "gpt-chat-tts-model";

export function isAllowedTtsModel(model: string): model is TtsModelId {
  return TTS_MODELS.some((entry) => entry.id === model);
}

export function resolveTtsModel(model: string | undefined): TtsModelId {
  if (model && isAllowedTtsModel(model)) {
    return model;
  }

  return DEFAULT_TTS_MODEL;
}

export function getStoredTtsModel(): TtsModelId {
  const stored = localStorage.getItem(TTS_MODEL_STORAGE_KEY);
  return resolveTtsModel(stored ?? undefined);
}

export function ttsModelSupportsInstructions(model: TtsModelId): boolean {
  return (
    TTS_MODELS.find((entry) => entry.id === model)?.supportsInstructions ??
    false
  );
}

export const DEFAULT_SPEECH_STYLE = "neutral";

export const SPEECH_STYLES = [
  { id: "neutral", label: "Neutral", instructions: "" },
  {
    id: "warm",
    label: "Warm",
    instructions: "Speak in a warm, friendly, and reassuring tone.",
  },
  {
    id: "concise",
    label: "Concise",
    instructions:
      "Speak clearly and concisely with a steady, professional tone.",
  },
  {
    id: "whisper",
    label: "Whisper",
    instructions: "Speak softly in a gentle whisper.",
  },
] as const;

export type SpeechStyleId = (typeof SPEECH_STYLES)[number]["id"];

export const SPEECH_STYLE_ITEMS = SPEECH_STYLES.map((entry) => ({
  value: entry.id,
  label: entry.label,
}));

export const SPEECH_STYLE_STORAGE_KEY = "gpt-chat-speech-style";

export function isAllowedSpeechStyle(style: string): style is SpeechStyleId {
  return SPEECH_STYLES.some((entry) => entry.id === style);
}

export function resolveSpeechStyle(style: string | undefined): SpeechStyleId {
  if (style && isAllowedSpeechStyle(style)) {
    return style;
  }

  return DEFAULT_SPEECH_STYLE;
}

export function getStoredSpeechStyle(): SpeechStyleId {
  const stored = localStorage.getItem(SPEECH_STYLE_STORAGE_KEY);
  return resolveSpeechStyle(stored ?? undefined);
}

export function getSpeechStyleInstructions(style: SpeechStyleId): string {
  return SPEECH_STYLES.find((entry) => entry.id === style)?.instructions ?? "";
}

export const DEFAULT_SPEECH_SPEED = 1;
export const SPEECH_SPEED_MIN = 0.25;
export const SPEECH_SPEED_MAX = 4;
export const SPEECH_SPEED_STEP = 0.05;
export const SPEECH_SPEED_STORAGE_KEY = "gpt-chat-speech-speed";

export function clampSpeechSpeed(speed: number): number {
  const rounded = Math.round(speed / SPEECH_SPEED_STEP) * SPEECH_SPEED_STEP;
  return Math.min(SPEECH_SPEED_MAX, Math.max(SPEECH_SPEED_MIN, rounded));
}

export function resolveSpeechSpeed(speed: number | undefined): number {
  if (typeof speed !== "number" || Number.isNaN(speed)) {
    return DEFAULT_SPEECH_SPEED;
  }

  return clampSpeechSpeed(speed);
}

export function getStoredSpeechSpeed(): number {
  const stored = localStorage.getItem(SPEECH_SPEED_STORAGE_KEY);
  if (stored === null) {
    return DEFAULT_SPEECH_SPEED;
  }

  return resolveSpeechSpeed(Number.parseFloat(stored));
}
