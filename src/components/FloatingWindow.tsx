import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import { GripHorizontal, X, Minus, Maximize2, Pin, PinOff } from 'lucide-react'
import PDFViewer from './PDFViewer'
import type { Pin as PinType } from '../background/index'

interface Props {
  pin: PinType
  zIndex: number
  onClose: () => void
  onUpdate: (updates: Partial<PinType>) => void
  onFocus: () => void
}

export default function FloatingWindow({ pin, zIndex, onClose, onUpdate, onFocus }: Props) {
  const x = useMotionValue(pin.x)
  const y = useMotionValue(pin.y)
  const [minimized, setMinimized] = useState(pin.minimized)
  const headerHeight = 28

  // Sync position when another tab broadcasts an update
  useEffect(() => { x.set(pin.x) }, [pin.x, x])
  useEffect(() => { y.set(pin.y) }, [pin.y, y])

  const handleMinimize = () => {
    const next = !minimized
    setMinimized(next)
    onUpdate({ minimized: next })
  }

  const handleTogglePin = () => {
    onUpdate({ pinnedToFront: !pin.pinnedToFront })
    onFocus()
  }

  // ── Manual drag on header ────────────────────────────────────────────────
  // Replaces Framer's `drag` prop entirely. Driving x/y motion values directly
  // means React never re-renders during drag (Framer updates CSS transforms),
  // and the resize handle can't interact with Framer's internal drag state.
  const dragState = useRef<{
    startMouseX: number
    startMouseY: number
    startPinX: number
    startPinY: number
  } | null>(null)

  const handleWindowMouseDown = (e: React.MouseEvent) => {
    // Only trigger on left click, not button clicks inside the header
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    onFocus()

    dragState.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPinX: x.get(),
      startPinY: y.get(),
    }

    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return
      x.set(dragState.current.startPinX + ev.clientX - dragState.current.startMouseX)
      y.set(dragState.current.startPinY + ev.clientY - dragState.current.startMouseY)
    }

    const onUp = () => {
      if (!dragState.current) return
      onUpdate({ x: x.get(), y: y.get() })
      dragState.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <motion.div
      className="pb-window"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        x,
        y,
        width: pin.width,
        zIndex,
      }}
      // No Framer drag — handled manually on the header above
      onMouseDown={(e) => {
        onFocus();
        if (pin.type === 'image') handleWindowMouseDown(e);
      }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {/* ── Header Bar ── */}
      <div
        className="pb-drag-handle"
        onMouseDown={(e) => {
          if (pin.type === 'pdf') handleWindowMouseDown(e);
        }}
        style={{
          height: headerHeight,
          background: 'var(--pb-bg)',
          borderBottom: minimized ? 'none' : '1px solid var(--pb-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 6px',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
          <GripHorizontal size={12} color="var(--pb-border-light)" />
          {pin.label && (
            <span style={{
              fontSize: 10,
              color: 'var(--pb-text-muted)',
              fontFamily: 'Courier Prime, monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: pin.width - 100,
            }}>
              {pin.label}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <HeaderButton
            onClick={handleTogglePin}
            title={pin.pinnedToFront ? 'Unpin from front' : 'Pin to front'}
            active={pin.pinnedToFront}
          >
            {pin.pinnedToFront ? <PinOff size={10} /> : <Pin size={10} />}
          </HeaderButton>

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
          background: 'var(--pb-bg)',
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
                pointerEvents: 'none',
              }}
              draggable={false}
            />
          ) : (
            <PDFViewer src={pin.src} height={pin.height - headerHeight} />
          )}
        </div>
      )}

      {!minimized && <ResizeHandle pin={pin} onUpdate={onUpdate} />}
    </motion.div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeaderButton({
  onClick,
  title,
  active = false,
  children,
}: {
  onClick: () => void
  title: string
  active?: boolean
  children: ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? 'var(--pb-border)' : hovered ? 'var(--pb-border)' : 'transparent',
        border: '1px solid',
        borderColor: active ? 'var(--pb-accent)' : hovered ? 'var(--pb-border-light)' : 'transparent',
        borderRadius: 2,
        color: active ? 'var(--pb-text)' : hovered ? 'var(--pb-text)' : 'var(--pb-text-dim)',
        cursor: 'pointer',
        width: 18, height: 18,
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

function ResizeHandle({ pin, onUpdate }: {
  pin: PinType
  onUpdate: (u: Partial<PinType>) => void
}) {
  const startRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)

  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        startRef.current = { x: e.clientX, y: e.clientY, w: pin.width, h: pin.height }

        const onMove = (ev: MouseEvent) => {
          if (!startRef.current) return
          onUpdate({
            width: Math.max(200, startRef.current.w + (ev.clientX - startRef.current.x)),
            height: Math.max(150, startRef.current.h + (ev.clientY - startRef.current.y)),
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
        position: 'absolute', bottom: 0, right: 0,
        width: 14, height: 14,
        cursor: 'nwse-resize',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
        padding: 3,
      }}
    >
      <svg width="8" height="8" viewBox="0 0 8 8">
        <circle cx="6" cy="6" r="1" fill="var(--pb-border-light)" />
        <circle cx="3" cy="6" r="1" fill="var(--pb-border-light)" />
        <circle cx="6" cy="3" r="1" fill="var(--pb-border-light)" />
      </svg>
    </div>
  )
}