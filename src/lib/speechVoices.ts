export const DEFAULT_SPEECH_VOICE = "marin";

export const SPEECH_VOICES = [
  { id: "marin", label: "Marin" },
  { id: "cedar", label: "Cedar" },
  { id: "coral", label: "Coral" },
  { id: "shimmer", label: "Shimmer" },
  { id: "sage", label: "Sage" },
  { id: "nova", label: "Nova" },
  { id: "alloy", label: "Alloy" },
  { id: "ash", label: "Ash" },
  { id: "ballad", label: "Ballad" },
  { id: "echo", label: "Echo" },
  { id: "fable", label: "Fable" },
  { id: "onyx", label: "Onyx" },
  { id: "verse", label: "Verse" },
] as const;

export type SpeechVoiceId = (typeof SPEECH_VOICES)[number]["id"];

export const SPEECH_VOICE_ITEMS = SPEECH_VOICES.map((entry) => ({
  value: entry.id,
  label: entry.label,
}));

export const SPEECH_VOICE_STORAGE_KEY = "gpt-chat-speech-voice";

export function isAllowedSpeechVoice(voice: string): voice is SpeechVoiceId {
  return SPEECH_VOICES.some((entry) => entry.id === voice);
}

export function resolveSpeechVoice(voice: string | undefined): SpeechVoiceId {
  if (voice && isAllowedSpeechVoice(voice)) {
    return voice;
  }

  return DEFAULT_SPEECH_VOICE;
}

export function getStoredSpeechVoice(): SpeechVoiceId {
  const stored = localStorage.getItem(SPEECH_VOICE_STORAGE_KEY);
  return resolveSpeechVoice(stored ?? undefined);
}
