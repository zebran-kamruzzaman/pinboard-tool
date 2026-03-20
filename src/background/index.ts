// src/background/index.ts

export type PinType = 'image' | 'pdf'

export interface Pin {
  id: string
  type: PinType
  src: string          // URL or base64 data URI for local files
  x: number
  y: number
  width: number
  height: number
  minimized: boolean
  label?: string       // Optional display label (filename for PDFs)
}

// ─── Message Types ────────────────────────────────────────────────────────────

type Message =
  | { action: 'ADD_PIN';    pin: Pin }
  | { action: 'REMOVE_PIN'; id: string }
  | { action: 'UPDATE_PIN'; id: string; updates: Partial<Pin> }
  | { action: 'GET_PINS' }

// ─── Storage Helpers ──────────────────────────────────────────────────────────

async function getPins(): Promise<Pin[]> {
  const result = await chrome.storage.local.get('pins')
  return (result.pins ?? []) as Pin[]

}

async function setPins(pins: Pin[]): Promise<void> {
  await chrome.storage.local.set({ pins })
}

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {

    // All handlers are async — must return true to keep channel open
    ;(async () => {
      const pins = await getPins()

      switch (message.action) {

        case 'GET_PINS':
          sendResponse({ pins })
          break

        case 'ADD_PIN': {
          const updated = [...pins, message.pin]
          await setPins(updated)
          sendResponse({ success: true })
          // Broadcast to all content scripts so other tabs update live
          broadcastPinsUpdate(updated)
          break
        }

        case 'REMOVE_PIN': {
          const updated = pins.filter(p => p.id !== message.id)
          await setPins(updated)
          sendResponse({ success: true })
          broadcastPinsUpdate(updated)
          break
        }

        case 'UPDATE_PIN': {
          const updated = pins.map(p =>
            p.id === message.id ? { ...p, ...message.updates } : p
          )
          await setPins(updated)
          sendResponse({ success: true })
          // Don't broadcast position updates — too noisy, each tab manages its own
          break
        }

        default:
          sendResponse({ error: 'Unknown action' })
      }
    })()

    return true // Keep message channel open for async response
  }
)

// ─── Broadcast to all tabs ────────────────────────────────────────────────────

async function broadcastPinsUpdate(pins: Pin[]) {
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'PINS_UPDATED',
        pins,
      }).catch(() => {
        // Tab may not have content script loaded — silently ignore
      })
    }
  }
}