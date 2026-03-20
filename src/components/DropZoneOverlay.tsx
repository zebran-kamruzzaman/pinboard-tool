// src/components/DropZoneOverlay.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { FileText } from 'lucide-react'

interface Props {
  visible: boolean
  onDrop: (file: File) => void
  onDragLeave: () => void
}

export default function DropZoneOverlay({ visible, onDrop, onDragLeave }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer?.files[0]
            if (file?.type === 'application/pdf') onDrop(file)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={onDragLeave}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(27, 27, 27, 0.85)',
            backdropFilter: 'blur(2px)',
            zIndex: 2147483646,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            border: '1px dashed #4A4A4A',
            margin: 12,
            borderRadius: 4,
            pointerEvents: 'all',
          }}
        >
          <FileText size={32} color="#4A4A4A" />
          <span style={{
            fontFamily: 'Courier Prime, monospace',
            fontSize: 13,
            color: '#888',
            letterSpacing: '0.05em',
          }}>
            Drop PDF to pin
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}