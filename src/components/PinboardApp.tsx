// src/components/PinboardApp.tsx
import { useState, useCallback, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import FloatingWindow from './FloatingWindow'
import DropZoneOverlay from './DropZoneOverlay'
import SnipOverlay from './SnipOverlay'
import { usePins } from '../hooks/usePins'
import { useInteractionListeners } from '../hooks/useInteractionListeners'
import type { Pin } from '../background/index'

// ── Z-index tiers ─────────────────────────────────────────────────────────────
// Normal windows:  1  – 999   (ordered by last interaction)
// Pinned windows: 1000 – 9998 (always above normal, ordered by last interaction)
// Snip overlay:   9999
const PINNED_TIER_OFFSET = 1000

export default function PinboardApp() {
  const { pins, addPin, removePin, updatePin } = usePins()
  const [dropZoneVisible, setDropZoneVisible] = useState(false)
  const [snipActive, setSnipActive] = useState(false)

  // ── Z-order management ─────────────────────────────────────────────────────
  // zMap maps pin IDs to a counter value. Higher value = renders on top within its tier.
  const [zMap, setZMap] = useState<Record<string, number>>({})
  const zCounter = useRef(0)

  const bringToFront = useCallback((id: string) => {
    zCounter.current++
    setZMap(prev => ({ ...prev, [id]: zCounter.current }))
  }, [])

  // Wrap addPin so new pins automatically start at the front
  const handleAddPin = useCallback((pin: Pin) => {
    addPin(pin)
    // Schedule after state update so the pin exists in zMap
    setTimeout(() => bringToFront(pin.id), 0)
  }, [addPin, bringToFront])

  useInteractionListeners({ addPin: handleAddPin, setDropZoneVisible, setSnipActive })

  return (
    <>
      <AnimatePresence>
        {pins.map(pin => {
          const localZ = zMap[pin.id] ?? 0
          const zIndex = pin.pinnedToFront
            ? PINNED_TIER_OFFSET + localZ
            : localZ

          return (
            <FloatingWindow
              key={pin.id}
              pin={pin}
              zIndex={zIndex}
              onClose={() => removePin(pin.id)}
              onUpdate={(updates) => updatePin(pin.id, updates)}
              onFocus={() => bringToFront(pin.id)}
            />
          )
        })}
      </AnimatePresence>

      <DropZoneOverlay
        visible={dropZoneVisible}
        onDrop={(file) => {
          setDropZoneVisible(false)
          const reader = new FileReader()
          reader.onload = (e) => {
            if (!e.target?.result) return
            handleAddPin({
              id: crypto.randomUUID(),
              type: 'pdf',
              src: e.target.result as string,
              x: 100,
              y: 100,
              width: 480,
              height: 620,
              minimized: false,
              label: file.name,
            })
          }
          reader.readAsDataURL(file)
        }}
        onDragLeave={() => setDropZoneVisible(false)}
      />

      {snipActive && (
        <SnipOverlay
          onCapture={(pin) => {
            handleAddPin(pin)
            setSnipActive(false)
          }}
          onCancel={() => setSnipActive(false)}
        />
      )}
    </>
  )
}