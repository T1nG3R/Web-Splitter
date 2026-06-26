# ✂ WebSplitter

A free, private, browser-based file splitter. Split any file into chunks — no uploads, no server, everything stays on your device.

**[→ Open WebSplitter](https://t1ng3r.github.io/Web-Splitter/)**

## Features

- 🔒 **100% private** — files never leave your browser
- 📦 **Archive-compatible naming** — 7-Zip style (`.001`, `.002`) or Part style (`.part001`)
- 💾 **Any file, any size** — memory-efficient streaming via `Blob.slice()`
- ⚡ **Auto-download + manual re-download** — sequential auto-download with individual chunk buttons
- 🎛️ **Flexible chunk sizes** — presets (700 MB CD, 1 GB, 2 GB, 4 GB FAT32) or custom

## Usage

1. Drag & drop or click to select a file
2. Choose a chunk size (default: 2 GB)
3. Choose naming convention (default: 7-Zip style)
4. Click **✂ Split File**
5. Chunks download automatically — use the ↓ buttons to re-download any chunk

## Reassembling with 7-Zip

1. Place all chunk files in the same folder
2. Right-click the `.001` file → **7-Zip → Combine files…**
3. Click OK

## Browser Support

Requires File API + Blob.slice() + URL.createObjectURL() — supported in Chrome 57+, Firefox 55+, Edge 79+, Safari 10.1+.

## Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages → Source → Deploy from branch → master / (root)**
3. Your app will be live at `https://t1ng3r.github.io/Web-Splitter/`

## Development

No build step required. Open `index.html` in any modern browser.
