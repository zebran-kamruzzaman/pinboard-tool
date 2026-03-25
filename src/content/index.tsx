import pinboardCssText from '../styles/pinboard.css?inline'
import { createRoot } from 'react-dom/client'
import PinboardApp from '../components/PinboardApp.tsx'

function mountPinboard() {
  if (document.getElementById('pinboard-root')) return

  const host = document.createElement('div')
  host.id = 'pinboard-root'
  host.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    z-index: 2147483647;
    pointer-events: none;
    overflow: visible;
  `

  const attachAndMount = () => {
    document.documentElement.appendChild(host)
    const shadow = host.attachShadow({ mode: 'open' })

    const fontLink = document.createElement('link')
    fontLink.rel = 'stylesheet'
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Playfair+Display:wght@600&display=swap'
    shadow.appendChild(fontLink)

    const styleTag = document.createElement('style')
    styleTag.textContent = pinboardCssText
    shadow.appendChild(styleTag)

    const mountPoint = document.createElement('div')
    mountPoint.style.cssText = 'pointer-events: all;'
    shadow.appendChild(mountPoint)

    createRoot(mountPoint).render(<PinboardApp />)
  }

  // document_start fires before <html> exists — wait for it
  if (document.documentElement) {
    attachAndMount()
  } else {
    new MutationObserver((_, obs) => {
      if (document.documentElement) {
        obs.disconnect()
        attachAndMount()
      }
    }).observe(document, { childList: true })
  }
}

mountPinboard()