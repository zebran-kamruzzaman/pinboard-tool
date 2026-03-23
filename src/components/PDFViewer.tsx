// src/components/PDFViewer.tsx
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Point PDF.js to its worker script
// The worker must be a web-accessible resource
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.mjs')


interface Props {
  src: string    // URL or base64 data URI
  height: number
}

export default function PDFViewer({ src, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Load the PDF document ──────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    setError(null)

    // PDF.js accepts URLs and binary data, but not raw data URIs directly
    // We need to strip the base64 prefix for local files
    let loadingTask
    if (src.startsWith('data:')) {
      const base64 = src.split(',')[1]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      loadingTask = pdfjsLib.getDocument({ data: bytes })
    } else {
      loadingTask = pdfjsLib.getDocument(src)
    }

    loadingTask.promise
      .then((doc) => {
        setPdfDoc(doc)
        setTotalPages(doc.numPages)
        setLoading(false)
      })
      .catch((err) => {
        setError('Could not load PDF.')
        setLoading(false)
        console.error('[Pinboard] PDF load error:', err)
      })

    return () => { loadingTask.destroy() }
  }, [src])

  // ── Render a single page onto the canvas ──────────────────────────────────
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return

    let cancelled = false

    pdfDoc.getPage(currentPage).then((page) => {
      if (cancelled || !canvasRef.current) return

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')!
      // Scale to fill the window width
      const viewport = page.getViewport({ scale: 1 })
      const containerWidth = canvas.parentElement?.clientWidth || canvas.parentElement?.offsetWidth || 480
      const scale = containerWidth / viewport.width
      const scaledViewport = page.getViewport({ scale })

      canvas.width = scaledViewport.width
      canvas.height = scaledViewport.height

      page.render({ canvasContext: ctx, viewport: scaledViewport, canvas: canvas })
    })

    return () => { cancelled = true }
  }, [pdfDoc, currentPage])

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const goTo = (n: number) => {
    setCurrentPage(Math.min(Math.max(1, n), totalPages))
  }

  if (loading || error) return (
    <div style={{ display: 'flex', flexDirection: 'column', height }}>
      <PDFState label={loading ? 'Loading...' : error!} isError={!!error} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height }}>
      {/* Scrollable canvas area */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: '#111' }}>
        <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%' }} />
      </div>

      {/* Page controls */}
      {totalPages > 1 && (
        <div style={{
          height: 30,
          background: '#1B1B1B',
          borderTop: '1px solid #2C2C2C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          <NavButton onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1}>
            <ChevronLeft size={12} />
          </NavButton>
          <span style={{ fontSize: 10, color: '#888', fontFamily: 'Courier Prime, monospace' }}>
            {currentPage} / {totalPages}
          </span>
          <NavButton onClick={() => goTo(currentPage + 1)} disabled={currentPage >= totalPages}>
            <ChevronRight size={12} />
          </NavButton>
        </div>
      )}
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