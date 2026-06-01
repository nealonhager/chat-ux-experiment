# GPT Realtime Chat

An experiment in what talking to an LLM could feel like.

Most chat UIs assume one linear thread: you type, the model replies, repeat. This app tries something different — a **conversation tree** on a pan-zoom canvas, where you can fork from any assistant reply, compare branches side by side, and keep going from whichever answer you actually want to build on.

The composer lives on the canvas itself (embedded in the active assistant bubble, not docked at the bottom of the screen). You can type or dictate with your voice, pick the chat model per send, and optionally hear replies read aloud with configurable voice, speed, and style.

This is a small React + Express playground, not a product. The point is to explore interaction patterns — branching, spatial layout, voice in/out, model choice — and see what sticks.

## What you can do

- Start a conversation and watch it grow as a tree, not a scrollback
- Click an assistant message to make it active, then send from there (creating a sibling branch)
- Pan and zoom the canvas; use the minimap to jump around
- Record voice input via OpenAI Realtime transcription
- Toggle spoken responses and tune TTS in the minimap panel
- Choose the chat model from the composer

## Setup

1. Set your API key in the shell before starting the app:

   ```powershell
   $env:OPEN_AI_API_KEY="your-key-here"
   ```

2. Install dependencies:

   ```powershell
   npm install
   ```

3. Start the app:

   ```powershell
   npm run dev
   ```

4. Open the Vite URL, start a conversation on the canvas, and allow microphone access if you want voice input.

## Notes

- Voice transcription uses WebRTC; the local Express server forwards the SDP offer to OpenAI at `/v1/realtime/calls`.
- Chat and speech requests go through the local server, which validates model and voice choices against an allowlist.
- The app also accepts `OPENAI_API_KEY` if you already use that variable name.
- Domain terms and design decisions live in [`CONTEXT.md`](CONTEXT.md) and [`docs/adr/`](docs/adr/).
