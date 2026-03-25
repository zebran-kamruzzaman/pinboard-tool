# Pinboard

A Chrome extension that lets you pin floating images and PDFs onto any webpage. Pins persist across tabs and browser sessions — move them once, they stay there.

---

## Installation

> Requires Node.js 18+ and Google Chrome 110+

```bash
git clone https://github.com/zebran-kamruzzaman/pinboard-tool
cd pinboard-tool
npm install
```

Copy the PDF.js worker to `public/`:

```bash
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs
```

Build the extension:

```bash
npm run dev
```

Load into Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder

Leave `npm run dev` running — it rebuilds automatically when you save files.

---

## Usage

| Action | Result |
|---|---|
| `Alt + Click` an image | Pins the image as a floating window |
| `Alt + Click` a `.pdf` link | Opens the PDF in a floating viewer |
| Drag a `.pdf` file into the browser | Drop zone appears — release to pin |
| `Alt + Shift + S` | Activates snip mode — drag to capture a region |
| `Esc` | Cancels snip mode |
| Drag a window by its header | Moves the window |
| Drag the bottom-right corner | Resizes the window |
| Click `—` | Minimizes the window to its header bar |
| Click the pin icon | Locks the window above all others |
| Click `×` | Closes and removes the pin |

### PDF viewer controls

- **Page arrows** — navigate between pages
- **Zoom slider** — zoom content inside the window (100% = fits window width)
- The PDF re-renders automatically when you resize the window
- Horizontal scrolling available when zoomed in past window width

### Window layering

Windows stack in order of last interaction. The **pin button** (📌) in the header locks a window to the front — all unpinned windows will appear behind it. Pinning a second window places it above the first pinned window. Clicking the pin button again releases it back to normal stacking order.

---

## File size limits

PDFs stored as local files (drag-and-drop) are converted to base64 and saved in `chrome.storage.local`, which has a ~10MB limit per entry. Pinboard enforces a **7MB maximum** on dropped files to stay safely within this limit.

PDFs opened via link (Alt + Click on a `.pdf` URL) are not stored as data — only the URL is saved — so there is no size limit for those.

If a file is too large, Pinboard will show an error and suggest using a PDF compressor.

---

## Tech stack

| Tool | Purpose |
|---|---|
| React 19 + Vite 8 | UI framework and build tooling |
| `@crxjs/vite-plugin` | Bridges Vite with Chrome Extension Manifest V3 |
| Framer Motion | Window animations |
| PDF.js (Mozilla) | In-browser PDF rendering |
| Tailwind CSS 4 | Styling within Shadow DOM |
| Chrome Storage API | Cross-tab and cross-session pin persistence |
| Shadow DOM | Isolates Pinboard's styles from host page CSS |

