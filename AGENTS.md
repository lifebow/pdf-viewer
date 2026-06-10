# PDF Viewer - Agent Context

## Overview

PDF viewer web app cho người dùng Việt Nam. Deploy tại https://pdf.lifebow.net

- **Stack**: React 19 + TypeScript + Vite 7
- **PDF engine**: `react-pdf` v10 (wrapper của pdf.js)
- **Icons**: `lucide-react`
- **Styling**: Custom CSS (glassmorphism, CSS variables, dark/light/sepia/night themes)
- **Package manager**: pnpm (standalone binary tại `/Users/lifebow/Library/pnpm/pnpm`)
- **Node**: nvm, dùng v22 — cần `source ~/.nvm/nvm.sh && nvm use 22` trước khi chạy build
- **Deploy**: GitHub Pages via `gh-pages`

## Build & Run

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm build    # tsc -b && vite build
source ~/.nvm/nvm.sh && nvm use 22 && pnpm dev       # vite dev server
source ~/.nvm/nvm.sh && nvm use 22 && pnpm deploy    # gh-pages
```

## Project Structure

```
src/
├── main.tsx                    # React entry
├── App.tsx                     # Landing page: URL input, file upload, history (IndexedDB)
├── index.css                   # All styles (~1100 lines, themes, glass, responsive)
├── components/
│   ├── PdfViewer.tsx           # Main viewer: Document wrapper, state, search, history
│   └── pdf/
│       ├── Toolbar.tsx         # Top toolbar: nav, search, zoom, rotation, themes, bookmarks
│       ├── Sidebar.tsx         # Left sidebar: page thumbnails, bookmark indicators
│       ├── PdfContent.tsx      # Page rendering (paginated / scroll mode)
│       ├── LinkPreviewTooltip.tsx  # Hover preview tooltip cho internal PDF links (cite)
│       └── ExtractionModal.tsx # Text extraction modal (hiện đang commented out)
└── utils/
    └── pdfStorage.ts           # IndexedDB wrapper: save/get/delete PDFs, storage stats
```

## Architecture Notes

### PDF Rendering
- `<Document>` wraps toàn bộ viewer, `<Page>` render từng trang
- pdf.js worker load từ unpkg CDN
- Hai view mode: **paginated** (1-3 trang) và **scroll** (all pages vertical)
- `renderAnnotationLayer={true}` và `renderTextLayer={true}` cho content pages
- Sidebar thumbnails render ở scale 0.2, không có annotation/text layer

### Link Preview (mới thêm)
- `LinkPreviewTooltip` component dùng event delegation (mouseover/mouseout) trên container
- Detect internal links qua class `.internalLink` hoặc href bắt đầu `#`
- Parse target page từ `#page=N`, `#NR` (pdf.js ref format)
- Render thumbnail `<Page>` ở scale 0.3 trong tooltip floating
- CSS class: `.link-preview-tooltip`, `.link-preview-header`, `.link-preview-page`

### State Management
- Toàn bộ state nằm trong `PdfViewer.tsx` (no external state lib)
- History + bookmarks lưu localStorage
- PDF files lưu IndexedDB (persist across sessions)
- Session restore qua sessionStorage + localStorage

### CORS
- Remote PDFs fetch qua Cloudflare Worker proxy: `steep-union-ca07.artmoney306.workers.dev`

### Theming
- CSS variables trong `:root.light` / `:root.dark`
- PDF page filter: invert (dark), sepia, night mode
- Inline `<style>` trong PdfViewer cho pdf-page filters

## Key Patterns

- **Text search**: Extract text async (batch 5 pages/tick), highlight matches via DOM manipulation
- **Auto-scale**: fit-width / fit-page tính từ container size vs page original dimensions
- **Scroll sync**: IntersectionObserver-like logic detect current page in scroll mode
- **Keyboard shortcuts**: Arrow keys (page nav), Ctrl+Shift+F (search), Escape (close search)

## UI Language

Giao diện tiếng Việt.
