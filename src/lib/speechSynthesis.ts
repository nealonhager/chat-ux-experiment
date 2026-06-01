export type SpeechSpeakOptions = {
  onAudioReady?: () => void;
};

export class SpeechPlayer {
  private audio: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private speakGeneration = 0;

  async speak(text: string, options: SpeechSpeakOptions = {}): Promise<void> {
    const generation = ++this.speakGeneration;
    this.stopAudio();

    const response = await fetch("/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (generation !== this.speakGeneration) {
      return;
    }

    if (!response.ok) {
      throw new Error((await response.text()) || "Speech synthesis failed.");
    }

    const blob = await response.blob();

    if (generation !== this.speakGeneration) {
      return;
    }

    this.objectUrl = URL.createObjectURL(blob);
    this.audio = new Audio(this.objectUrl);
    options.onAudioReady?.();

    await new Promise<void>((resolve, reject) => {
      const audio = this.audio;
      if (!audio || generation !== this.speakGeneration) {
        resolve();
        return;
      }

      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("Audio playback failed."));
      void audio.play().catch(reject);
    });
  }

  stop(): void {
    this.speakGeneration += 1;
    this.stopAudio();
  }

  private stopAudio(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio = null;
    }

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
