// src/components/FloatingWindow.tsx
import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { GripHorizontal, X, Minus, Maximize2 } from 'lucide-react'
import PDFViewer from './PDFViewer.tsx'
import type { Pin } from '../background/index'

interface Props {
  pin: Pin
  onClose: () => void
  onUpdate: (updates: Partial<Pin>) => void
}

export default function FloatingWindow({ pin, onClose, onUpdate }: Props) {
  const [minimized, setMinimized] = useState(pin.minimized)

  const handleMinimize = () => {
    const next = !minimized
    setMinimized(next)
    onUpdate({ minimized: next })
  }

  const headerHeight = 28 // px

  return (
    <motion.div
      className="pb-window"
      style={{
        position: 'fixed',
        x: pin.x,
        y: pin.y,
        width: pin.width,
        zIndex: 2147483647,
      }}
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={(_, info) => {
        onUpdate({
          x: pin.x + info.offset.x,
          y: pin.y + info.offset.y,
        })
      }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {/* ── Header Bar ── */}
      <div
        className="pb-drag-handle"
        style={{
          height: headerHeight,
          background: '#1B1B1B',
          borderBottom: minimized ? 'none' : '1px solid #2C2C2C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 6px',
          userSelect: 'none',
        }}
      >
        {/* Left: drag icon + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
          <GripHorizontal size={12} color="#4A4A4A" />
          {pin.label && (
            <span style={{
              fontSize: 10,
              color: '#888',
              fontFamily: 'Courier Prime, monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: pin.width - 80,
            }}>
              {pin.label}
            </span>
          )}
        </div>

        {/* Right: controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <HeaderButton onClick={handleMinimize} title={minimized ? 'Expand' : 'Minimize'}>
            {minimized ? <Maximize2 size={10} /> : <Minus size={10} />}
          </HeaderButton>
          <HeaderButton onClick={onClose} title="Close pin">
            <X size={10} />
          </HeaderButton>
        </div>
      </div>

      {/* ── Content Area ── */}
      {!minimized && (
        <div style={{
          width: '100%',
          height: pin.height - headerHeight,
          overflow: 'hidden',
          background: '#1B1B1B',
        }}>
          {pin.type === 'image' ? (
            <img
              src={pin.src}
              alt={pin.label ?? 'Pinned image'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
                pointerEvents: 'none', // prevent host page interactions
              }}
              draggable={false}
            />
          ) : (
            <PDFViewer src={pin.src} height={pin.height - headerHeight} />
          )}
        </div>
      )}

      {/* ── Resize Handle ── */}
      {!minimized && (
        <ResizeHandle pin={pin} onUpdate={onUpdate} />
      )}
    </motion.div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeaderButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#2C2C2C' : 'transparent',
        border: '1px solid',
        borderColor: hovered ? '#4A4A4A' : 'transparent',
        borderRadius: 2,
        color: hovered ? '#E8E8E8' : '#666',
        cursor: 'pointer',
        width: 18,
        height: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.1s ease',
        padding: 0,
      }}
    >
      {children}
    </button>
  )
}

function ResizeHandle({
  pin,
  onUpdate,
}: {
  pin: Pin
  onUpdate: (u: Partial<Pin>) => void
}) {
  const startRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)

  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault()
        startRef.current = { x: e.clientX, y: e.clientY, w: pin.width, h: pin.height }

        const onMove = (ev: MouseEvent) => {
          if (!startRef.current) return
          const dx = ev.clientX - startRef.current.x
          const dy = ev.clientY - startRef.current.y
          onUpdate({
            width: Math.max(200, startRef.current.w + dx),
            height: Math.max(150, startRef.current.h + dy),
          })
        }

        const onUp = () => {
          startRef.current = null
          window.removeEventListener('mousemove', onMove)
          window.removeEventListener('mouseup', onUp)
        }

        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
      }}
      style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        cursor: 'nwse-resize',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        padding: 3,
      }}
    >
      {/* Visual resize dots */}
      <svg width="8" height="8" viewBox="0 0 8 8">
        <circle cx="6" cy="6" r="1" fill="#4A4A4A" />
        <circle cx="3" cy="6" r="1" fill="#4A4A4A" />
        <circle cx="6" cy="3" r="1" fill="#4A4A4A" />
      </svg>
    </div>
  )
}