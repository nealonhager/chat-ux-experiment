import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import express, { type Request, type Response } from 'express'

const app = express()
const currentFilePath = fileURLToPath(import.meta.url)
const currentDirectoryPath = path.dirname(currentFilePath)
const distDirectoryPath = path.join(currentDirectoryPath, 'dist')
const port = Number(process.env.PORT ?? 3000)

app.use(express.text({ type: ['application/sdp', 'text/plain'] }))

/**
 * Return the configured OpenAI API key.
 */
function getApiKey(): string {
  const apiKey = process.env.OPEN_AI_API_KEY ?? process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('Set OPEN_AI_API_KEY or OPENAI_API_KEY before starting the server.')
  }

  return apiKey
}

/**
 * Build the session configuration for the Realtime call.
 */
function buildSessionConfig(): Record<string, unknown> {
  return {
    type: 'realtime',
    model: process.env.REALTIME_MODEL ?? 'gpt-realtime-2',
    instructions:
      'You are a helpful voice assistant. Speak naturally, keep answers concise, and ask a brief follow-up question when it fits.',
    audio: {
      input: {
        noise_reduction: {
          type: 'near_field',
        },
        transcription: {
          model: 'gpt-4o-mini-transcribe',
        },
        turn_detection: {
          type: 'server_vad',
        },
      },
      output: {
        voice: 'marin',
      },
    },
  }
}

/**
 * Send the browser SDP offer to OpenAI and return the SDP answer.
 */
async function createRealtimeAnswer(offerSdp: string): Promise<string> {
  const formData = new FormData()
  formData.set('sdp', offerSdp)
  formData.set('session', JSON.stringify(buildSessionConfig()))

  const response = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: formData,
  })

  const responseBody = await response.text()

  if (!response.ok) {
    throw new Error(responseBody || 'Realtime session request failed.')
  }

  return responseBody
}

/**
 * Return whether the production client bundle exists.
 */
function hasBuiltClient(): boolean {
  return fs.existsSync(path.join(distDirectoryPath, 'index.html'))
}

app.post('/session', async (request: Request, response: Response) => {
  if (!request.body) {
    response.status(400).json({ error: 'Missing SDP offer.' })
    return
  }

  try {
    const answerSdp = await createRealtimeAnswer(request.body)
    response.type('application/sdp').send(answerSdp)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.'
    response.status(500).json({ error: message })
  }
})

if (hasBuiltClient()) {
  app.use(express.static(distDirectoryPath))

  app.get(/.*/, (_request: Request, response: Response) => {
    response.sendFile(path.join(distDirectoryPath, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`Realtime server listening on http://localhost:${port}`)
})
