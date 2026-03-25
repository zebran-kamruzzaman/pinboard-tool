// src/components/PDFViewer.tsx
import { useEffect, useRef, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { ChevronLeft, ChevronRight } from 'lucide-react'

pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.mjs')

interface Props {
  src: string
  height: number
}

export default function PDFViewer({ src, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [containerWidth, setContainerWidth] = useState(480)
  const [zoom, setZoom] = useState(1)

  // ── Callback ref — attaches ResizeObserver only once the DOM node exists ──
  // This fixes the bug where useEffect ran during the loading state, when
  // containerRef.current was null, so the observer was never actually attached.
  const containerCallbackRef = useCallback((node: HTMLDivElement | null) => {
    // Disconnect any previous observer if the node changes
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    if (!node) return

    // Read the initial width immediately on attach
    const initialWidth = node.getBoundingClientRect().width
    if (initialWidth > 0) setContainerWidth(initialWidth)

    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setContainerWidth(w)
    })
    obs.observe(node)
    observerRef.current = obs
  }, []) // stable — no deps needed

  // ── Load PDF document ──────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    setError(null)
    setCurrentPage(1)
    setZoom(1) // reset zoom when a new PDF loads

    let loadingTask: pdfjsLib.PDFDocumentLoadingTask
    if (src.startsWith('data:')) {
      const base64 = src.split(',')[1]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      loadingTask = pdfjsLib.getDocument({ data: bytes })
    } else {
      loadingTask = pdfjsLib.getDocument(src)
    }

    loadingTask.promise
      .then(doc => {
        setPdfDoc(doc)
        setTotalPages(doc.numPages)
        setLoading(false)
      })
      .catch(err => {
        setError('Could not load PDF.')
        setLoading(false)
        console.error('[Pinboard] PDF load error:', err)
      })

    return () => { loadingTask.destroy() }
  }, [src])

  // ── Render page ────────────────────────────────────────────────────────────
  // Runs on: page change, container resize, zoom change.
  // containerWidth drives fit-to-width. zoom multiplies on top of that.
  // Changing page never resets zoom — that's intentional so zoom persists.
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return

    let cancelled = false

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
      renderTaskRef.current = null
    }

    pdfDoc.getPage(currentPage).then(page => {
      if (cancelled || !canvasRef.current) return

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')!
      const baseViewport = page.getViewport({ scale: 1 })

      // Step 1: fit the page exactly to the container width (zoom = 1 baseline)
      // Step 2: multiply by user zoom — this enlarges content beyond the window
      //         which is fine since the canvas container has overflowY: auto
      const fitScale = containerWidth / baseViewport.width
      const finalScale = fitScale * zoom
      const viewport = page.getViewport({ scale: finalScale })

      canvas.width = viewport.width
      canvas.height = viewport.height

      const task = page.render({ canvasContext: ctx, viewport, canvas })
      renderTaskRef.current = task
      task.promise.catch(() => {}) // swallow cancellation errors
    })

    return () => { cancelled = true }
  }, [pdfDoc, currentPage, containerWidth, zoom])

  const goTo = (n: number) => setCurrentPage(Math.min(Math.max(1, n), totalPages))

  if (loading || error) return (
    <div style={{ display: 'flex', flexDirection: 'column', height }}>
      <PDFState label={loading ? 'Loading...' : error!} isError={!!error} />
    </div>
  )

  const controlsHeight = 36
  const canvasAreaHeight = height - controlsHeight

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height }}>

      {/* Canvas area — callback ref guarantees ResizeObserver attaches after load */}
      <div
        ref={containerCallbackRef}
        style={{
          flex: 1,
          height: canvasAreaHeight,
          overflowY: 'auto',
          overflowX: 'auto',
          background: '#111',
        }}
      >
        <canvas ref={canvasRef} style={{ display: 'block', maxWidth: zoom > 1 ? 'none' : '100%' }} />
      </div>

      {/* Controls: page nav + zoom */}
      <div style={{
        height: controlsHeight,
        background: '#1B1B1B',
        borderTop: '1px solid #2C2C2C',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        gap: 8,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <NavButton onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1}>
            <ChevronLeft size={12} />
          </NavButton>
          <span style={{
            fontSize: 10,
            color: '#888',
            fontFamily: 'Courier Prime, monospace',
            whiteSpace: 'nowrap',
          }}>
            {currentPage} / {totalPages}
          </span>
          <NavButton onClick={() => goTo(currentPage + 1)} disabled={currentPage >= totalPages}>
            <ChevronRight size={12} />
          </NavButton>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
          <span style={{
            fontSize: 9,
            color: '#555',
            fontFamily: 'Courier Prime, monospace',
            whiteSpace: 'nowrap',
          }}>
            {Math.round(zoom * 100)}%
          </span>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            title="Zoom"
            style={{ width: 72, accentColor: '#4A4A4A', cursor: 'pointer' }}
          />
        </div>
      </div>
    </div>
  )
}

function PDFState({ label, isError }: { label: string; isError?: boolean }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: isError ? '#FF6B6B' : '#888',
      fontSize: 11,
      fontFamily: 'Courier Prime, monospace',
      textAlign: 'center',
      padding: '0 12px',
    }}>
      {label}
    </div>
  )
}

function NavButton({ onClick, disabled, children }: {
  onClick: () => void
  disabled: boolean
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'none',
        border: 'none',
        color: disabled ? '#333' : '#888',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: '2px 4px',
      }}
    >
      {children}
    </button>
  )
}