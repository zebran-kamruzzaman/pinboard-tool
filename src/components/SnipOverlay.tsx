// src/components/SnipOverlay.tsx
import { useState, useEffect } from 'react'
import type { Pin } from '../background/index'

interface Selection {
  startX: number
  startY: number
  endX: number
  endY: number
}

interface Props {
  onCapture: (pin: Pin) => void
  onCancel: () => void
}

function normalizeRect(sel: Selection) {
  return {
    x: Math.min(sel.startX, sel.endX),
    y: Math.min(sel.startY, sel.endY),
    width: Math.abs(sel.endX - sel.startX),
    height: Math.abs(sel.endY - sel.startY),
  }
}

export default function SnipOverlay({ onCapture, onCancel }: Props) {
  const [selection, setSelection] = useState<Selection | null>(null)
  const [dragging, setDragging] = useState(false)

  // Esc to cancel
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  const rect = selection ? normalizeRect(selection) : null

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    setSelection({ startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !selection) return
    setSelection(prev => prev ? { ...prev, endX: e.clientX, endY: e.clientY } : null)
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!dragging || !selection) return
    e.preventDefault()
    setDragging(false)

    const finalSel = { ...selection, endX: e.clientX, endY: e.clientY }
    const r = normalizeRect(finalSel)

    // Ignore tiny accidental drags
    if (r.width < 10 || r.height < 10) { onCancel(); return }

    // Ask background to capture the visible tab
    chrome.runtime.sendMessage({ action: 'CAPTURE_TAB' }, (response) => {
      if (!response?.dataUrl) { onCancel(); return }

      const img = new Image()
      img.onload = () => {
        // captureVisibleTab returns at device pixel ratio resolution — account for it
        const dpr = window.devicePixelRatio || 1
        const canvas = document.createElement('canvas')
        canvas.width = r.width * dpr
        canvas.height = r.height * dpr
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(
          img,
          r.x * dpr, r.y * dpr, r.width * dpr, r.height * dpr,
          0, 0, r.width * dpr, r.height * dpr
        )
        const croppedUrl = canvas.toDataURL('image/png')

        onCapture({
          id: crypto.randomUUID(),
          type: 'image',
          src: croppedUrl,
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          minimized: false,
          label: `snip-${Date.now()}.png`,
        })
      }
      img.src = response.dataUrl
    })
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        position: 'fixed',
        inset: 0,
        cursor: 'crosshair',
        zIndex: 9999,
        // Before selection: light dim. Once dragging, let boxShadow on rect handle the overlay
        background: rect ? 'transparent' : 'rgba(0, 0, 0, 0.3)',
        userSelect: 'none',
        pointerEvents: 'all',
      }}
    >
      {/* Instructions — shown before drag starts */}
      {!dragging && !rect && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ color: '#E8E8E8', fontFamily: 'Courier Prime, monospace', fontSize: 13, letterSpacing: '0.05em' }}>
            drag to select region
          </div>
          <div style={{ color: '#555', fontFamily: 'Courier Prime, monospace', fontSize: 11, marginTop: 6 }}>
            esc to cancel · alt+shift+s to toggle
          </div>
        </div>
      )}

      {/* Selection rectangle — boxShadow creates the darkened surround effect */}
      {rect && rect.width > 0 && rect.height > 0 && (
        <div
          style={{
            position: 'absolute',
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            border: '1px solid #E8E8E8',
            background: 'rgba(255, 255, 255, 0.04)',
            // The large box-shadow darkens everything outside the selection rect
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}