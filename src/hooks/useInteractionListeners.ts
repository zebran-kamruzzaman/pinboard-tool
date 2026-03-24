// src/hooks/useInteractionListeners.ts
import { useEffect } from 'react'
import type { Pin } from '../background/index'

interface Options {
  addPin: (pin: Pin) => void
  setDropZoneVisible: (v: boolean) => void
  setSnipActive: (v: boolean) => void
}

export function useInteractionListeners({ addPin, setDropZoneVisible, setSnipActive }: Options) {

  // ── Alt + Click listener ──────────────────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!e.altKey) return

      const target = e.target as HTMLElement

      // Case 1: Alt+Click on an <img>
      if (target.tagName === 'IMG') {
        e.preventDefault()
        e.stopPropagation()

        const img = target as HTMLImageElement
        const src = img.src || img.currentSrc

        // Use the image's natural dimensions, capped to reasonable maximums
        const w = Math.min(Math.max(img.naturalWidth || 320, 100), 700)
        const h = Math.min(Math.max(img.naturalHeight || 260, 100), 600)

        addPin({
          id: crypto.randomUUID(),
          type: 'image',
          src,
          x: Math.max(0, e.clientX - w / 2),
          y: Math.max(0, e.clientY - h / 2),
          width: w,
          height: h,
          minimized: false,
          label: src.split('/').pop()?.split('?')[0] ?? 'image',
        })
      }

      // Case 2: Alt+Click on a <a> link ending in .pdf
      const link = target.closest('a') as HTMLAnchorElement | null
      if (link && link.href.toLowerCase().endsWith('.pdf')) {
        e.preventDefault()
        e.stopPropagation()

        addPin({
          id: crypto.randomUUID(),
          type: 'pdf',
          src: link.href,
          x: e.clientX - 240,
          y: e.clientY - 60,
          width: 480,
          height: 620,
          minimized: false,
          label: decodeURIComponent(link.href.split('/').pop() ?? 'document.pdf'),
        })
      }
    }

    // Listen on the host document (not shadow DOM) to capture native elements
    document.addEventListener('click', handleClick, { capture: true })
    return () => document.removeEventListener('click', handleClick, { capture: true })
  }, [addPin])

  // ── Alt + Shift + S: activate snip tool ───────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        setSnipActive(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [setSnipActive])


  // ── Drag-and-Drop listener for local PDF files ────────────────────────────────────────────────
  useEffect(() => {
    let dragCounter = 0 // Track nested drag enter/leave events

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault()
      dragCounter++
      const hasPdfFile = Array.from(e.dataTransfer?.items ?? []).some(
        item => item.kind === 'file' && item.type === 'application/pdf'
      )
      if (hasPdfFile) setDropZoneVisible(true)
    }

    const onDragLeave = () => {
      dragCounter--
      if (dragCounter <= 0) {
        dragCounter = 0
        setDropZoneVisible(false)
      }
    }

    const onDragOver = (e: DragEvent) => { e.preventDefault() }

    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      dragCounter = 0
      setDropZoneVisible(false)
    }

    document.addEventListener('dragenter', onDragEnter)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('drop', onDrop)

    return () => {
      document.removeEventListener('dragenter', onDragEnter)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('drop', onDrop)
    }
  }, [setDropZoneVisible])
}