import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express, { type Request, type Response } from "express";

import { isAllowedChatModel, resolveChatModel } from "./src/lib/chatModels.ts";
import {
  isAllowedSpeechVoice,
  resolveSpeechVoice,
} from "./src/lib/speechVoices.ts";
import {
  getSpeechStyleInstructions,
  isAllowedSpeechStyle,
  isAllowedTtsModel,
  resolveSpeechSpeed,
  resolveTtsModel,
  ttsModelSupportsInstructions,
} from "./src/lib/speechSettings.ts";

const app = express();
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = path.dirname(currentFilePath);
const distDirectoryPath = path.join(currentDirectoryPath, "dist");
const port = Number(process.env.PORT ?? 3000);

app.use(express.json({ limit: "1mb" }));
app.use(express.text({ type: ["application/sdp", "text/plain"] }));

/**
 * Return the configured OpenAI API key.
 */
function getApiKey(): string {
  const apiKey = process.env.OPEN_AI_API_KEY ?? process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Set OPEN_AI_API_KEY or OPENAI_API_KEY before starting the server."
    );
  }

  return apiKey;
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

/**
 * Build the session configuration for a Realtime transcription call.
 */
function buildTranscriptionSessionConfig(): Record<string, unknown> {
  return {
    type: "transcription",
    audio: {
      input: {
        transcription: {
          model:
            process.env.REALTIME_TRANSCRIPTION_MODEL ?? "gpt-realtime-whisper",
          language: process.env.TRANSCRIPTION_LANGUAGE ?? "en",
          delay: process.env.TRANSCRIPTION_DELAY ?? "low",
        },
        turn_detection: null,
      },
    },
  };
}

/**
 * Send the browser SDP offer to OpenAI and return the SDP answer.
 */
async function createTranscriptionAnswer(offerSdp: string): Promise<string> {
  const formData = new FormData();
  formData.set("sdp", offerSdp);
  formData.set("session", JSON.stringify(buildTranscriptionSessionConfig()));

  const response = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: formData,
  });

  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(responseBody || "Transcription session request failed.");
  }

  return responseBody;
}

function getApiErrorMessage(
  responseBody: { error?: { message?: string } },
  fallback: string
): string {
  return responseBody.error?.message ?? fallback;
}

type ChatCompletionChunk = {
  choices?: Array<{ delta?: { content?: string } }>;
  error?: { message?: string };
};

type ChatStreamClientEvent =
  | { delta: string }
  | { done: true }
  | { model: string }
  | { error: string };

function getChatModel(): string {
  return resolveChatModel(process.env.CHAT_MODEL);
}

function getRequestedChatModel(request: Request): string {
  const model = request.body?.model;
  if (typeof model === "string" && isAllowedChatModel(model)) {
    return model;
  }

  return getChatModel();
}

function writeChatStreamEvent(
  response: Response,
  event: ChatStreamClientEvent
): void {
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

function parseOpenAiSsePayload(payload: string): ChatStreamClientEvent[] {
  if (payload === "[DONE]") {
    return [{ done: true }];
  }

  try {
    const chunk = JSON.parse(payload) as ChatCompletionChunk;
    const delta = chunk.choices?.[0]?.delta?.content;
    if (typeof delta === "string" && delta.length > 0) {
      return [{ delta }];
    }
  } catch {
    return [];
  }

  return [];
}

/**
 * Stream assistant tokens from the Chat Completions API to the browser as SSE.
 */
async function streamChatCompletion(
  messages: ChatMessage[],
  model: string,
  response: Response
): Promise<void> {
  const openAiResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant. Keep answers concise and clear.",
          },
          ...messages,
        ],
      }),
    }
  );

  if (!openAiResponse.ok) {
    const responseBody =
      (await openAiResponse.json()) as ChatCompletionResponse;
    throw new Error(
      getApiErrorMessage(responseBody, "Chat completion request failed.")
    );
  }

  if (!openAiResponse.body) {
    throw new Error("The model returned an empty stream.");
  }

  response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.flushHeaders();
  writeChatStreamEvent(response, { model });

  const reader = openAiResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let hasContent = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const eventBlock of events) {
        for (const line of eventBlock.split("\n")) {
          if (!line.startsWith("data: ")) {
            continue;
          }

          for (const clientEvent of parseOpenAiSsePayload(line.slice(6))) {
            if ("delta" in clientEvent) {
              hasContent = true;
            }
            writeChatStreamEvent(response, clientEvent);
          }
        }
      }
    }

    if (!hasContent) {
      throw new Error("The model returned an empty response.");
    }

    writeChatStreamEvent(response, { done: true });
    response.end();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Chat stream failed.";
    writeChatStreamEvent(response, { error: message });
    response.end();
  }
}

type SpeechErrorResponse = {
  error?: { message?: string };
};

type SpeechSynthesisOptions = {
  text: string;
  voice: string;
  model: string;
  speed: number;
  instructions?: string;
};

/**
 * Synthesize speech with the OpenAI Audio API.
 */
async function synthesizeSpeech(
  options: SpeechSynthesisOptions
): Promise<ArrayBuffer> {
  const body: Record<string, unknown> = {
    model: options.model,
    voice: options.voice,
    input: options.text,
    speed: options.speed,
  };

  if (options.instructions) {
    body.instructions = options.instructions;
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const responseBody = (await response.json()) as SpeechErrorResponse;
    throw new Error(
      getApiErrorMessage(responseBody, "Speech synthesis request failed.")
    );
  }

  return response.arrayBuffer();
}

function getDefaultSpeechVoice(): string {
  return resolveSpeechVoice(process.env.TTS_VOICE);
}

function getDefaultTtsModel(): string {
  return resolveTtsModel(process.env.TTS_MODEL);
}

function getRequestedSpeechVoice(request: Request): string {
  const voice = request.body?.voice;
  if (typeof voice === "string" && isAllowedSpeechVoice(voice)) {
    return voice;
  }

  return getDefaultSpeechVoice();
}

function getRequestedTtsModel(request: Request): string {
  const model = request.body?.model;
  if (typeof model === "string" && isAllowedTtsModel(model)) {
    return model;
  }

  return getDefaultTtsModel();
}

function getRequestedSpeechSpeed(request: Request): number {
  const speed = request.body?.speed;
  if (typeof speed === "number") {
    return resolveSpeechSpeed(speed);
  }

  return resolveSpeechSpeed(undefined);
}

function getRequestedSpeechInstructions(
  request: Request,
  model: string
): string | undefined {
  if (!isAllowedTtsModel(model) || !ttsModelSupportsInstructions(model)) {
    return undefined;
  }

  const style = request.body?.style;
  if (typeof style !== "string" || !isAllowedSpeechStyle(style)) {
    return undefined;
  }

  const instructions = getSpeechStyleInstructions(style);
  return instructions.length > 0 ? instructions : undefined;
}

function getSpeechSynthesisOptions(request: Request): SpeechSynthesisOptions {
  const model = getRequestedTtsModel(request);

  return {
    text: "",
    voice: getRequestedSpeechVoice(request),
    model,
    speed: getRequestedSpeechSpeed(request),
    instructions: getRequestedSpeechInstructions(request, model),
  };
}

/**
 * Return whether the production client bundle exists.
 */
function hasBuiltClient(): boolean {
  return fs.existsSync(path.join(distDirectoryPath, "index.html"));
}

app.post("/chat", async (request: Request, response: Response) => {
  const messages = request.body?.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    response.status(400).json({ error: "Missing messages." });
    return;
  }

  try {
    await streamChatCompletion(
      messages as ChatMessage[],
      getRequestedChatModel(request),
      response
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error.";
    response.status(500).json({ error: message });
  }
});

app.post("/speech", async (request: Request, response: Response) => {
  const text = request.body?.text;

  if (typeof text !== "string" || !text.trim()) {
    response.status(400).json({ error: "Missing text." });
    return;
  }

  try {
    const speechOptions = getSpeechSynthesisOptions(request);
    const audio = await synthesizeSpeech({
      ...speechOptions,
      text: text.trim(),
    });
    response.type("audio/mpeg").send(Buffer.from(audio));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error.";
    response.status(500).json({ error: message });
  }
});

app.post(
  "/transcription-session",
  async (request: Request, response: Response) => {
    if (!request.body) {
      response.status(400).json({ error: "Missing SDP offer." });
      return;
    }

    try {
      const answerSdp = await createTranscriptionAnswer(request.body);
      response.type("application/sdp").send(answerSdp);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown server error.";
      response.status(500).json({ error: message });
    }
  }
);

if (hasBuiltClient()) {
  app.use(express.static(distDirectoryPath));

  app.get(/.*/, (_request: Request, response: Response) => {
    response.sendFile(path.join(distDirectoryPath, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
