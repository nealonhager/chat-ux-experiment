export class SpeechPlayer {
  private audio: HTMLAudioElement | null = null
  private objectUrl: string | null = null

  async speak(text: string): Promise<void> {
    this.stop()

    const response = await fetch('/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      throw new Error((await response.text()) || 'Speech synthesis failed.')
    }

    const blob = await response.blob()
    this.objectUrl = URL.createObjectURL(blob)
    this.audio = new Audio(this.objectUrl)

    await new Promise<void>((resolve, reject) => {
      const audio = this.audio
      if (!audio) {
        reject(new Error('Audio playback failed.'))
        return
      }

      audio.onended = () => resolve()
      audio.onerror = () => reject(new Error('Audio playback failed.'))
      void audio.play().catch(reject)
    })
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause()
      this.audio.onended = null
      this.audio.onerror = null
      this.audio = null
    }

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl)
      this.objectUrl = null
    }
  }
}
