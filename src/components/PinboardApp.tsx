// src/components/PinboardApp.tsx
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import FloatingWindow from './FloatingWindow'
import DropZoneOverlay from './DropZoneOverlay'
import { usePins } from '../hooks/usePins'
import { useInteractionListeners } from '../hooks/useInteractionListeners'

export default function PinboardApp() {
  const { pins, addPin, removePin, updatePin } = usePins()
  const [dropZoneVisible, setDropZoneVisible] = useState(false)

  // Register Alt+Click and drag listeners on the host document
  useInteractionListeners({ addPin, setDropZoneVisible })

  return (
    <>
      <AnimatePresence>
        {pins.map(pin => (
          <FloatingWindow
            key={pin.id}
            pin={pin}
            onClose={() => removePin(pin.id)}
            onUpdate={(updates) => updatePin(pin.id, updates)}
          />
        ))}
      </AnimatePresence>

      <DropZoneOverlay
        visible={dropZoneVisible}
        onDrop={(file) => {
          setDropZoneVisible(false)
          // Convert file to base64 data URI so it can be stored
          const reader = new FileReader()
          reader.onload = (e) => {
            if (!e.target?.result) return
            addPin({
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
    </>
  )
}