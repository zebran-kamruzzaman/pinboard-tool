// src/hooks/usePins.ts
import { useEffect, useState, useCallback } from 'react'
import type { Pin } from '../background/index'

export function usePins() {
  const [pins, setPins] = useState<Pin[]>([])

  // ── Load initial pins on mount ─────────────────────────────────────────────
  useEffect(() => {
    chrome.storage.local.get('pins', (result) => {
      if (result.pins) setPins(result.pins as Pin[])
    })
  }, [])

  // ── Listen for cross-tab pin updates ──────────────────────────────────────
  useEffect(() => {
    const listener = (message: { action: string; pins?: Pin[] }) => {
      if (message.action === 'PINS_UPDATED' && message.pins) {
        setPins(message.pins)
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  // ── Actions ───────────────────────────────────────────────────────────────

  const addPin = useCallback((pin: Pin) => {
    setPins(prev => [...prev, pin])
    chrome.runtime.sendMessage({ action: 'ADD_PIN', pin })
  }, [])

  const removePin = useCallback((id: string) => {
    setPins(prev => prev.filter(p => p.id !== id))
    chrome.runtime.sendMessage({ action: 'REMOVE_PIN', id })
  }, [])

  const updatePin = useCallback((id: string, updates: Partial<Pin>) => {
    // Optimistic local update — no need to wait for storage
    setPins(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    chrome.runtime.sendMessage({ action: 'UPDATE_PIN', id, updates })
  }, [])

  return { pins, addPin, removePin, updatePin }
}