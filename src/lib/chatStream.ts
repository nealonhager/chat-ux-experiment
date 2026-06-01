export type ChatStreamEvent =
  | { type: "delta"; delta: string }
  | { type: "meta"; model: string }
  | { type: "done" }
  | { type: "error"; message: string };

type ChatStreamPayload = {
  delta?: string;
  done?: true;
  model?: string;
  error?: string;
};

function parseChatStreamPayload(raw: string): ChatStreamEvent | null {
  try {
    const payload = JSON.parse(raw) as ChatStreamPayload;

    if (typeof payload.error === "string") {
      return { type: "error", message: payload.error };
    }

    if (payload.done) {
      return { type: "done" };
    }

    if (typeof payload.model === "string" && payload.model.length > 0) {
      return { type: "meta", model: payload.model };
    }

    if (typeof payload.delta === "string" && payload.delta.length > 0) {
      return { type: "delta", delta: payload.delta };
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Read SSE chat events from a streaming `/chat` response.
 */
export async function readChatStream(
  response: Response,
  onEvent: (event: ChatStreamEvent) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("The server returned an empty response.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

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

        const event = parseChatStreamPayload(line.slice(6));
        if (event) {
          onEvent(event);
        }
      }
    }
  }

  if (buffer.trim()) {
    for (const line of buffer.split("\n")) {
      if (!line.startsWith("data: ")) {
        continue;
      }

      const event = parseChatStreamPayload(line.slice(6));
      if (event) {
        onEvent(event);
      }
    }
  }
}
