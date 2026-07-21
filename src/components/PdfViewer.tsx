import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Document } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';

import Toolbar from './pdf/Toolbar';
import Sidebar, { type OutlineItem } from './pdf/Sidebar';
import PdfContent from './pdf/PdfContent';
import { getProxiedUrl } from '../utils/pdfjs';
import {
  readBookmarks, writeBookmarksFor, readHighlights, writeHighlightsFor,
  type Highlight,
} from '../utils/pdfStorage';
import { HL_COLORS, type TintId } from '../theme';

interface PdfViewerProps {
  url: string;
  storageKey: string;
  localStorageId?: string;
  tintId: TintId;
  setTintId: (id: TintId) => void;
  onBack: () => void;
}

interface SearchResult { page: number; snippet: string; }

const PdfViewer: React.FC<PdfViewerProps> = ({ url, storageKey, localStorageId, tintId, setTintId, onBack }) => {
  const proxiedUrl = getProxiedUrl(url);

  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [inputPage, setInputPage] = useState('1');
  const [scale, setScale] = useState(1.15);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [bookmarks, setBookmarks] = useState<number[]>(() => readBookmarks()[storageKey] || []);
  const [highlights, setHighlights] = useState<Highlight[]>(() => readHighlights()[storageKey] || []);
  const [tool, setTool] = useState<'read' | 'highlight'>('read');
  const [hlColor, setHlColor] = useState(HL_COLORS[0]);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 900);
  const [sidebarTab, setSidebarTab] = useState<'toc' | 'bm' | 'hl'>('toc');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const pagesTextRef = useRef<string[]>([]);
  const pageWidthRef = useRef<number | null>(null);
  const userZoomedRef = useRef(false);
  const titleName = decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'Tài liệu').replace(/\.pdf$/i, '');

  // Persist bookmarks / highlights.
  useEffect(() => { writeBookmarksFor(storageKey, bookmarks); }, [bookmarks, storageKey]);
  useEffect(() => { writeHighlightsFor(storageKey, highlights); }, [highlights, storageKey]);

  // Persist reading progress to pdf_history (debounced).
  useEffect(() => {
    if (!numPages) return;
    const timer = setTimeout(() => {
      let history: any[] = [];
      try { history = JSON.parse(localStorage.getItem('pdf_history') || '[]'); } catch { history = []; }
      const pendingId = sessionStorage.getItem('pending_localStorageId');
      const currentId = localStorageId || pendingId || undefined;
      let idx = -1;
      if (currentId) idx = history.findIndex(h => h.localStorageId === currentId);
      if (idx === -1) idx = history.findIndex(h => h.url === url);
      const name = idx > -1 ? history[idx].name : titleName;
      if (pendingId && pendingId === currentId) sessionStorage.removeItem('pending_localStorageId');
      const entry = { url, name, lastPage: pageNumber, numPages, lastViewed: new Date().toISOString(), localStorageId: currentId };
      if (idx > -1) history[idx] = entry;
      else { history.unshift(entry); if (history.length > 20) history.pop(); }
      localStorage.setItem('pdf_history', JSON.stringify(history));
    }, 1000);
    return () => clearTimeout(timer);
  }, [pageNumber, numPages, url, localStorageId, titleName]);

  // ── Search highlighting in the text layers ──
  const applySearchMarks = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const q = searchTerm.trim().toLowerCase();
    container.querySelectorAll<HTMLElement>('.react-pdf__Page__textContent span').forEach(sp => {
      sp.style.background = '';
      sp.style.borderRadius = '';
      if (q && sp.textContent && sp.textContent.toLowerCase().includes(q)) {
        sp.style.background = 'rgba(217,138,60,.45)';
        sp.style.borderRadius = '2px';
      }
    });
  }, [searchTerm]);

  useEffect(() => {
    const t = setTimeout(applySearchMarks, 100);
    return () => clearTimeout(t);
  }, [searchTerm, applySearchMarks]);

  // ── Navigation ──
  const goToPage = useCallback((n: number) => {
    const target = Math.max(1, Math.min(numPages || 1, n || 1));
    setPageNumber(target);
    setInputPage(String(target));
    const el = containerRef.current?.querySelector(`.pdf-page-wrapper[data-page-number="${target}"]`) as HTMLElement | null;
    if (el && containerRef.current) {
      containerRef.current.scrollTo({ top: el.offsetTop - 20, behavior: 'smooth' });
    }
  }, [numPages]);

  const prevPage = () => goToPage(pageNumber - 1);
  const nextPage = () => goToPage(pageNumber + 1);

  // Track current page while scrolling.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const center = container.getBoundingClientRect().top + container.clientHeight / 2;
      let best = pageNumber, min = Infinity;
      container.querySelectorAll('.pdf-page-wrapper').forEach(page => {
        const rect = page.getBoundingClientRect();
        const dist = Math.abs(center - (rect.top + rect.height / 2));
        if (dist < min) { min = dist; best = parseInt(page.getAttribute('data-page-number') || '1', 10); }
      });
      if (best !== pageNumber) { setPageNumber(best); setInputPage(String(best)); }
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [pageNumber, numPages]);

  // ── Zoom ──
  const setScaleClamped = (v: number) => { userZoomedRef.current = true; setScale(Math.max(0.6, Math.min(2.6, Math.round(v * 100) / 100))); };
  const zoomIn = () => setScaleClamped(scale + 0.15);
  const zoomOut = () => setScaleClamped(scale - 0.15);
  const zoomReset = () => { userZoomedRef.current = true; setScale(1.15); };

  // ── Document loading ──
  const flattenOutline = async (pdf: any, items: any[], depth: number): Promise<OutlineItem[]> => {
    const out: OutlineItem[] = [];
    for (const it of items) {
      let page: number | null = null;
      try {
        let dest = it.dest;
        if (typeof dest === 'string') dest = await pdf.getDestination(dest);
        if (Array.isArray(dest) && dest[0]) page = (await pdf.getPageIndex(dest[0])) + 1;
      } catch { /* ignore */ }
      out.push({ title: it.title, page, depth });
      if (it.items?.length) out.push(...await flattenOutline(pdf, it.items, depth + 1));
    }
    return out;
  };

  const onDocumentLoadSuccess = async (pdf: any) => {
    pdfDocRef.current = pdf;
    setNumPages(pdf.numPages);

    // Resume from stored progress.
    try {
      const history = JSON.parse(localStorage.getItem('pdf_history') || '[]');
      const entry = history.find((h: any) => (localStorageId ? h.localStorageId === localStorageId : h.url === url));
      if (entry && entry.lastPage > 1 && entry.lastPage <= pdf.numPages) {
        setTimeout(() => goToPage(entry.lastPage), 400);
      }
    } catch { /* ignore */ }

    try {
      const raw = await pdf.getOutline();
      setOutline(await flattenOutline(pdf, raw || [], 0));
    } catch { setOutline([]); }

    // Extract text for search in the background.
    const texts: string[] = [];
    const extract = async (start: number) => {
      const end = Math.min(start + 5, pdf.numPages);
      for (let i = start; i <= end; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        texts[i] = content.items.map((it: any) => it.str).join(' ');
      }
      if (end < pdf.numPages) setTimeout(() => extract(end + 1), 30);
      else pagesTextRef.current = texts;
    };
    extract(1);
  };

  const onPageLoadSuccess = (page: { getViewport: (o: { scale: number }) => { width: number } }) => {
    const width = page.getViewport({ scale: 1 }).width;
    pageWidthRef.current = width;
    if (!userZoomedRef.current && containerRef.current) {
      const avail = containerRef.current.clientWidth - 56;
      const fit = Math.min(1.6, Math.max(0.7, avail / width));
      if (Math.abs(fit - scale) > 0.01) setScale(fit);
    }
  };

  // ── Search ──
  const onSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchTerm(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const ql = q.toLowerCase();
    const results: SearchResult[] = [];
    const texts = pagesTextRef.current;
    for (let i = 1; i < texts.length; i++) {
      const t = texts[i] || '';
      const idx = t.toLowerCase().indexOf(ql);
      if (idx >= 0) {
        const start = Math.max(0, idx - 28);
        results.push({ page: i, snippet: (start > 0 ? '…' : '') + t.slice(start, idx + ql.length + 46) + '…' });
      }
    }
    setSearchResults(results);
    setSearching(false);
  };

  // ── Bookmarks & highlights ──
  const toggleBookmark = () => {
    setBookmarks(prev => prev.includes(pageNumber) ? prev.filter(p => p !== pageNumber) : [...prev, pageNumber].sort((a, b) => a - b));
  };

  const onSelectUp = () => {
    if (tool !== 'highlight') return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    let node: Node | null = range.commonAncestorContainer;
    let pageEl: HTMLElement | null = null;
    while (node) {
      if (node instanceof HTMLElement && node.classList.contains('react-pdf__Page')) { pageEl = node; break; }
      node = node.parentElement;
    }
    if (!pageEl) return;
    const pageN = parseInt(pageEl.getAttribute('data-page-number') || '0', 10);
    if (!pageN) return;
    const wr = pageEl.getBoundingClientRect();
    const rects = [...range.getClientRects()]
      .map(r => ({ x: (r.left - wr.left) / wr.width, y: (r.top - wr.top) / wr.height, w: r.width / wr.width, h: r.height / wr.height }))
      .filter(r => r.w > 0.002 && r.h > 0.002);
    if (!rects.length) return;
    const text = sel.toString().trim().replace(/\s+/g, ' ').slice(0, 160);
    const hl: Highlight = { id: 'h' + Date.now(), page: pageN, color: hlColor, rects, text };
    sel.removeAllRanges();
    setHighlights(prev => [...prev, hl]);
  };

  const deleteHighlight = (id: string) => setHighlights(prev => prev.filter(h => h.id !== id));

  const isNight = tintId === 'night';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', color: 'var(--ink)', overflow: 'hidden' }}>
      <Toolbar
        onBack={onBack}
        docTitle={titleName}
        pageNumber={pageNumber}
        numPages={numPages}
        inputPage={inputPage}
        setInputPage={setInputPage}
        goToPage={goToPage}
        prevPage={prevPage}
        nextPage={nextPage}
        scalePct={Math.round(scale * 100)}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        zoomReset={zoomReset}
        searchOpen={searchOpen}
        toggleSearch={() => setSearchOpen(o => !o)}
        isBookmarked={bookmarks.includes(pageNumber)}
        toggleBookmark={toggleBookmark}
        toolHl={tool === 'highlight'}
        toggleHl={() => setTool(t => t === 'highlight' ? 'read' : 'highlight')}
        tintId={tintId}
        setTintId={setTintId}
        sidebarOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(o => !o)}
      />

      {tool === 'highlight' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 20px', background: 'var(--panel)', borderBottom: '1px solid var(--border)', animation: 'lb-fade .2s both' }}>
          <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Bôi màu — chọn đoạn văn bản để đánh dấu:</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {HL_COLORS.map(c => (
              <button key={c} onClick={() => setHlColor(c)} style={{ width: 26, height: 26, borderRadius: 7, cursor: 'pointer', border: 'none', background: c, boxShadow: c === hlColor ? '0 0 0 2px var(--ink)' : 'inset 0 0 0 1px rgba(0,0,0,.1)' }} />
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {sidebarOpen && (
          <Sidebar
            tab={sidebarTab}
            setTab={setSidebarTab}
            outline={outline}
            bookmarks={bookmarks}
            highlights={highlights}
            goToPage={goToPage}
            deleteHighlight={deleteHighlight}
          />
        )}

        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          {searchOpen && (
            <div style={{ position: 'absolute', top: 16, right: 24, zIndex: 20, width: 340, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 18px 50px rgba(50,30,10,.22)', overflow: 'hidden', animation: 'lb-fade .2s both' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg>
                <input autoFocus value={searchTerm} onChange={onSearchInput} placeholder="Tìm trong tài liệu…" style={{ border: 'none', background: 'none', outline: 'none', flex: 1, fontSize: 14, color: 'var(--ink)' }} />
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{searching ? '…' : (searchTerm.trim() ? `${searchResults.length} kết quả` : '')}</span>
              </div>
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {searchResults.slice(0, 60).map((r, i) => (
                  <button key={i} className="lb-hover-panel" onClick={() => goToPage(r.page)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '11px 14px', border: 'none', borderBottom: '1px solid var(--border)', background: 'none', cursor: 'pointer' }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', marginBottom: 3 }}>TRANG {r.page}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.4 }}>{r.snippet}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Document
            file={proxiedUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Đang tải tài liệu…</div>}
            error={<div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C0522E' }}>Không thể tải PDF.</div>}
          >
            <PdfContent
              numPages={numPages}
              scale={scale}
              highlights={highlights}
              onPageLoadSuccess={onPageLoadSuccess}
              onRenderTextLayerSuccess={applySearchMarks}
              containerRef={containerRef}
              onMouseUp={onSelectUp}
            />
          </Document>
        </div>
      </div>

      <style>{`
        .pdf-page { box-shadow: 0 10px 34px rgba(60,40,20,.16), 0 2px 5px rgba(60,40,20,.08); border-radius: 2px; background: var(--page); }
        .pdf-page canvas { border-radius: 2px; ${isNight ? 'filter: invert(0.92) hue-rotate(180deg);' : ''} }
      `}</style>
    </div>
  );
};

export default PdfViewer;
