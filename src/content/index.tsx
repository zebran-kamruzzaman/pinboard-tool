// src/content/index.tsx
import { createRoot } from 'react-dom/client'
import PinboardApp from '../components/PinboardApp.tsx'

// ─── Shadow DOM Mount ─────────────────────────────────────────────────────────

function mountPinboard() {
  // Avoid double-mounting if hot-reloaded
  if (document.getElementById('pinboard-root')) return

  // 1. Create host element
  const host = document.createElement('div')
  host.id = 'pinboard-root'
  // Ensure the host itself doesn't interfere with page layout
  host.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    z-index: 2147483647;
    overflow: visible;
    pointer-events: none;
  `
  document.documentElement.appendChild(host)

  // 2. Attach shadow root
  const shadow = host.attachShadow({ mode: 'open' })

  // 3. Inject Google Fonts link (shadow DOM doesn't inherit document fonts)
  const fontLink = document.createElement('link')
  fontLink.rel = 'stylesheet'
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Playfair+Display:wght@600&display=swap'
  shadow.appendChild(fontLink)

  // 4. Inject Pinboard stylesheet
  const styleLink = document.createElement('link')
  styleLink.rel = 'stylesheet'
  // @crxjs handles the URL rewriting for web_accessible_resources
  styleLink.href = chrome.runtime.getURL('src/styles/pinboard.css')
  shadow.appendChild(styleLink)

  // 5. Create the React mount point inside shadow DOM
  const mountPoint = document.createElement('div')
  mountPoint.style.cssText = 'pointer-events: all;'
  shadow.appendChild(mountPoint)

  // 6. Mount React
  const root = createRoot(mountPoint)
  root.render(<PinboardApp />)
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountPinboard)
} else {
  mountPinboard()
}