type RealtimeTranscriptionEvent = {
  type: string;
  delta?: string;
  transcript?: string;
  item_id?: string;
  error?: { message?: string };
};

export type RealtimeTranscriptionHandlers = {
  onConnected: () => void;
  onDelta: (delta: string, draft: string) => void;
  onCompleted: (transcript: string) => void;
  onError: (message: string) => void;
};

export class RealtimeTranscriptionSession {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private drafts = new Map<string, string>();
  private handlers: RealtimeTranscriptionHandlers;

  constructor(handlers: RealtimeTranscriptionHandlers) {
    this.handlers = handlers;
  }

  private getCombinedDraft(): string {
    return Array.from(this.drafts.values()).join(" ").trim();
  }

  private handleEvent(rawEvent: MessageEvent<string>): void {
    const event = JSON.parse(rawEvent.data) as RealtimeTranscriptionEvent;

    if (
      event.type === "conversation.item.input_audio_transcription.delta" &&
      event.delta
    ) {
      const itemId = event.item_id ?? "default";
      const nextDraft = `${this.drafts.get(itemId) ?? ""}${event.delta}`;
      this.drafts.set(itemId, nextDraft);
      this.handlers.onDelta(event.delta, this.getCombinedDraft());
      return;
    }

    if (
      event.type === "conversation.item.input_audio_transcription.completed"
    ) {
      const itemId = event.item_id ?? "default";
      const transcript = (
        event.transcript ??
        this.drafts.get(itemId) ??
        ""
      ).trim();
      this.drafts.delete(itemId);

      if (transcript) {
        this.handlers.onCompleted(transcript);
      }
      return;
    }

    if (event.type === "error") {
      this.handlers.onError(
        event.error?.message ?? "Realtime transcription error."
      );
    }
  }

  async start(): Promise<void> {
    this.drafts.clear();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const peerConnection = new RTCPeerConnection();
    peerConnection.addTrack(stream.getTracks()[0], stream);

    const dataChannel = peerConnection.createDataChannel("oai-events");
    dataChannel.addEventListener("message", (event) => this.handleEvent(event));
    dataChannel.addEventListener("open", () => {
      this.handlers.onConnected();
    });

    this.peerConnection = peerConnection;
    this.localStream = stream;
    this.dataChannel = dataChannel;

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const response = await fetch("/transcription-session", {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: offer.sdp,
    });

    if (!response.ok) {
      throw new Error(
        (await response.text()) || "Could not start transcription session."
      );
    }

    await peerConnection.setRemoteDescription({
      type: "answer",
      sdp: await response.text(),
    });
  }

  commitAndClose(): void {
    if (this.dataChannel?.readyState === "open") {
      this.dataChannel.send(
        JSON.stringify({ type: "input_audio_buffer.commit" })
      );
    }

    window.setTimeout(() => this.dispose(), 250);
  }

  dispose(): void {
    this.dataChannel?.close();
    this.dataChannel = null;

    this.peerConnection?.close();
    this.peerConnection = null;

    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;

    this.drafts.clear();
  }
}
