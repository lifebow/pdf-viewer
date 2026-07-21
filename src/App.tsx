import React, { useState, useEffect, useRef } from 'react';
import PdfViewer from './components/PdfViewer';
import { version } from '../package.json';
import {
  savePdf, getPdf, deletePdf, getStorageStats, clearAllPdfs, formatFileSize,
} from './utils/pdfStorage';
import type { StorageStats } from './utils/pdfStorage';
import { loadPdfDocument, renderCover } from './utils/pdfjs';
import { applyTint, loadTintId, type TintId } from './theme';

interface HistoryItem {
  url: string;
  name: string;
  lastPage: number;
  numPages: number;
  lastViewed: string;
  localStorageId?: string;
}

const docKey = (item: HistoryItem) => item.localStorageId || item.url;
const isBlobUrl = (url: string) => url.startsWith('blob:');

// ── Icons (inline SVG, stroke-based, matching the handoff) ──
const Ico = {
  book: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" /><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /></svg>
  ),
  search: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg>
  ),
  plus: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
  ),
  hd: (s = 15) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
  ),
  trash: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" /></svg>
  ),
  upload: (s = 30) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0 4 4m-4-4-4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
  ),
};

function App() {
  const [tintId, setTintId] = useState<TintId>(loadTintId);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewLocalStorageId, setViewLocalStorageId] = useState<string | null>(null);

  const [pdfHistory, setPdfHistory] = useState<HistoryItem[]>([]);
  const [activeBlobUrls, setActiveBlobUrls] = useState<Map<string, string>>(new Map());
  const [storageStats, setStorageStats] = useState<StorageStats>({ files: [], totalSize: 0 });
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [metaPages, setMetaPages] = useState<Record<string, number>>({});

  const [libQuery, setLibQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const coverInFlight = useRef<Set<string>>(new Set());

  // Apply the active tint whenever it changes.
  useEffect(() => { applyTint(tintId); }, [tintId]);

  useEffect(() => {
    const stored = localStorage.getItem('pdf_history');
    if (stored) setPdfHistory(JSON.parse(stored));
  }, [viewUrl]);

  // Init: restore blob URLs from IndexedDB, deep-link, session restore, GC.
  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem('pdf_history');
      const lastViewedId = sessionStorage.getItem('last_viewed_id');
      const lastViewedUrl = sessionStorage.getItem('last_viewed_url');

      const deepLinkUrl = new URLSearchParams(window.location.search).get('url');
      if (deepLinkUrl) {
        setViewUrl(deepLinkUrl);
        setViewLocalStorageId(null);
        sessionStorage.setItem('last_viewed_url', deepLinkUrl);
        sessionStorage.removeItem('last_viewed_id');
        window.history.replaceState(null, '', window.location.pathname);
      }

      if (stored) {
        const parsedHistory: HistoryItem[] = JSON.parse(stored);
        const newBlobUrls = new Map<string, string>();
        for (const item of parsedHistory) {
          if (item.localStorageId) {
            try {
              const pdf = await getPdf(item.localStorageId);
              if (pdf) {
                const blobUrl = URL.createObjectURL(pdf.blob);
                newBlobUrls.set(item.localStorageId, blobUrl);
                if (!deepLinkUrl && lastViewedId === item.localStorageId) {
                  setViewUrl(blobUrl);
                  setViewLocalStorageId(item.localStorageId);
                }
              }
            } catch (e) {
              console.error('Failed to restore PDF:', e);
            }
          }
        }
        setActiveBlobUrls(newBlobUrls);
      }

      if (!deepLinkUrl && !lastViewedId && lastViewedUrl) {
        setViewUrl(lastViewedUrl);
        setViewLocalStorageId(null);
      }

      try {
        const stats = await getStorageStats();
        setStorageStats(stats);

        const currentHistory = localStorage.getItem('pdf_history');
        const historyData: HistoryItem[] = currentHistory ? JSON.parse(currentHistory) : [];
        const historyIds = new Set(historyData.map(i => i.localStorageId).filter(Boolean));
        if (historyIds.size > 0) {
          for (const file of stats.files) {
            if (!historyIds.has(file.id)) await deletePdf(file.id);
          }
          if (stats.files.length > historyIds.size) setStorageStats(await getStorageStats());
        }
      } catch (e) {
        console.error('Initial storage check failed:', e);
      }
    };

    init();
    return () => { activeBlobUrls.forEach(u => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate covers + page counts for history items lazily.
  useEffect(() => {
    if (!pdfHistory.length) return;
    let cancelled = false;
    (async () => {
      for (const item of pdfHistory) {
        const key = docKey(item);
        if (covers[key] || coverInFlight.current.has(key)) continue;
        coverInFlight.current.add(key);
        try {
          let pdf;
          if (item.localStorageId) {
            const rec = await getPdf(item.localStorageId);
            if (!rec) continue;
            pdf = await loadPdfDocument({ data: await rec.blob.arrayBuffer() });
          } else {
            if (isBlobUrl(item.url)) continue;
            pdf = await loadPdfDocument({ url: item.url });
          }
          const pages = pdf.numPages;
          const cover = await renderCover(pdf);
          if (cancelled) return;
          setMetaPages(m => ({ ...m, [key]: pages }));
          setCovers(c => ({ ...c, [key]: cover }));
        } catch (e) {
          console.warn('cover generation failed', key, e);
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfHistory, activeBlobUrls]);

  // ── Opening documents ──
  const openHistoryItem = (item: HistoryItem) => {
    if (item.localStorageId) {
      const blobUrl = activeBlobUrls.get(item.localStorageId);
      if (!blobUrl) { alert('Không thể mở file. Có thể file đã bị xóa. Vui lòng tải lại.'); return; }
      setViewUrl(blobUrl);
      setViewLocalStorageId(item.localStorageId);
      sessionStorage.setItem('last_viewed_id', item.localStorageId);
      return;
    }
    if (isBlobUrl(item.url)) { alert('File local cũ không còn khả dụng. Vui lòng tải lại file.'); return; }
    setViewUrl(item.url);
    setViewLocalStorageId(null);
    sessionStorage.setItem('last_viewed_url', item.url);
    sessionStorage.removeItem('last_viewed_id');
  };

  const processFile = async (file: File) => {
    if (!file || file.type !== 'application/pdf') { alert('Vui lòng chỉ chọn hoặc kéo thả file PDF.'); return; }

    const existing = storageStats.files.find(f => f.name === file.name && f.size === file.size);
    if (existing) {
      const pdf = await getPdf(existing.id);
      if (pdf) {
        const objectUrl = URL.createObjectURL(pdf.blob);
        setActiveBlobUrls(prev => new Map(prev).set(existing.id, objectUrl));
        setShowUpload(false);
        setViewUrl(objectUrl);
        setViewLocalStorageId(existing.id);
        sessionStorage.setItem('last_viewed_id', existing.id);
        sessionStorage.setItem('pending_localStorageId', existing.id);
        return;
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const localStorageId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
      await savePdf(localStorageId, arrayBuffer, file.name);
      const objectUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: 'application/pdf' }));
      setActiveBlobUrls(prev => new Map(prev).set(localStorageId, objectUrl));
      setStorageStats(await getStorageStats());
      sessionStorage.setItem('last_viewed_id', localStorageId);
      sessionStorage.setItem('pending_localStorageId', localStorageId);
      setShowUpload(false);
      setViewUrl(objectUrl);
      setViewLocalStorageId(localStorageId);
    } catch (err) {
      console.error('Failed to save PDF:', err);
      alert('Không thể lưu file (bộ nhớ trình duyệt có thể đã đầy).');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const openUrl = () => {
    const raw = urlInput.trim();
    if (!raw) { setUrlError('Hãy dán một link PDF.'); return; }
    let u: URL;
    try { u = new URL(raw); } catch { setUrlError('Link không hợp lệ.'); return; }
    if (!/^https?:$/.test(u.protocol)) { setUrlError('Chỉ hỗ trợ link http/https.'); return; }
    setShowUpload(false);
    setUrlInput('');
    setUrlError('');
    setViewUrl(u.href);
    setViewLocalStorageId(null);
    sessionStorage.setItem('last_viewed_url', u.href);
    sessionStorage.removeItem('last_viewed_id');
  };

  // ── Deletion ──
  const deleteStored = async (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    if (!item.localStorageId) return;
    if (!confirm('Xóa file này khỏi bộ nhớ? Hành động này không thể hoàn tác.')) return;
    try {
      const activeUrl = activeBlobUrls.get(item.localStorageId);
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
        setActiveBlobUrls(prev => { const n = new Map(prev); n.delete(item.localStorageId!); return n; });
      }
      await deletePdf(item.localStorageId);
      setStorageStats(await getStorageStats());
    } catch (err) { console.error('Failed to delete PDF:', err); }
    const newHistory = pdfHistory.filter(h => h.localStorageId !== item.localStorageId);
    setPdfHistory(newHistory);
    localStorage.setItem('pdf_history', JSON.stringify(newHistory));
  };

  const clearAllStorage = async () => {
    if (!confirm('Xóa tất cả file đã lưu? Hành động này không thể hoàn tác.')) return;
    try {
      activeBlobUrls.forEach(u => URL.revokeObjectURL(u));
      setActiveBlobUrls(new Map());
      await clearAllPdfs();
      setStorageStats({ files: [], totalSize: 0 });
    } catch (err) { console.error('Failed to clear storage:', err); }
    const newHistory = pdfHistory.filter(i => !i.localStorageId);
    setPdfHistory(newHistory);
    localStorage.setItem('pdf_history', JSON.stringify(newHistory));
  };

  // ── Drag & drop ──
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.relatedTarget === null) setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  if (viewUrl) {
    return (
      <PdfViewer
        key={viewUrl}
        url={viewUrl}
        storageKey={viewLocalStorageId || viewUrl}
        localStorageId={viewLocalStorageId || undefined}
        tintId={tintId}
        setTintId={setTintId}
        onBack={() => {
          setViewUrl(null);
          setViewLocalStorageId(null);
          sessionStorage.removeItem('last_viewed_id');
          sessionStorage.removeItem('last_viewed_url');
        }}
      />
    );
  }

  const q = libQuery.trim().toLowerCase();
  const docsView = pdfHistory.filter(d => !q || d.name.toLowerCase().includes(q));
  const storedCount = storageStats.files.length;
  const hasStored = storedCount > 0;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}
    >
      {isDragging && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(40,28,14,.42)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ padding: '48px 60px', borderRadius: 24, background: 'var(--surface)', border: '2px dashed var(--accent)', textAlign: 'center', color: 'var(--accent)' }}>
            {Ico.upload(52)}
            <div className="serif" style={{ fontSize: 26, marginTop: 14, color: 'var(--ink)' }}>Thả file để đọc ngay</div>
            <div style={{ color: 'var(--muted)', marginTop: 4 }}>Hỗ trợ tất cả các file PDF</div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '20px 44px', position: 'sticky', top: 0, zIndex: 5, background: 'color-mix(in srgb, var(--bg) 88%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{Ico.book(18)}</div>
          <span className="serif" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '.2px' }}>Lifebow</span>
        </div>
        <div style={{ flex: 1, maxWidth: 440, display: 'flex', alignItems: 'center', gap: 10, height: 42, padding: '0 15px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--muted)', display: 'flex' }}>{Ico.search(16)}</span>
          <input value={libQuery} onChange={e => setLibQuery(e.target.value)} placeholder="Tìm trong thư viện…" style={{ border: 'none', background: 'none', outline: 'none', flex: 1, fontSize: 14.5, color: 'var(--ink)' }} />
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => { setShowUpload(true); setUrlError(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, height: 42, padding: '0 18px', borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 14.5, fontWeight: 600 }}>
          {Ico.plus(16)} Tải tài liệu
        </button>
      </header>

      {/* Body */}
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '44px 44px 80px' }}>
        <div style={{ marginBottom: 38 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>Thư viện</div>
          <h1 className="serif" style={{ fontWeight: 500, fontSize: 40, lineHeight: 1.1, margin: '0 0 8px' }}>Chào bạn, tiếp tục đọc nhé.</h1>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 16, maxWidth: 520 }}>Một không gian đọc yên tĩnh, ấm áp — tập trung trọn vẹn vào từng trang sách.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 13 }}>
            {Ico.hd(15)}
            <span>Bộ nhớ đã dùng: <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{formatFileSize(storageStats.totalSize)}</strong> · {storedCount} file đã lưu</span>
          </div>
          {hasStored && (
            <button onClick={clearAllStorage} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 34, padding: '0 13px', borderRadius: 9, border: '1px solid var(--border)', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              {Ico.trash(14)} Xóa tất cả file đã lưu
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: '30px 26px' }}>
          {docsView.map((item, idx) => {
            const key = docKey(item);
            const cover = covers[key];
            const pages = metaPages[key] ?? (item.numPages || 0);
            return (
              <div key={key + idx} style={{ position: 'relative', animation: 'lb-fade .4s both' }}>
                <div onClick={() => openHistoryItem(item)} style={{ cursor: 'pointer' }}>
                  <div style={{ position: 'relative', aspectRatio: '3 / 4.05', borderRadius: 6, overflow: 'hidden', background: 'var(--panel)', boxShadow: '0 12px 34px rgba(70,45,20,.16),0 2px 6px rgba(70,45,20,.1)', border: '1px solid var(--border)' }}>
                    {cover ? (
                      <img src={cover} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="lb-spinner" style={{ width: 26, height: 26 }} />
                      </div>
                    )}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: 'linear-gradient(90deg,rgba(0,0,0,.16),transparent)' }} />
                    {item.lastPage > 1 && (
                      <div style={{ position: 'absolute', left: 8, bottom: 8, padding: '4px 9px', borderRadius: 20, background: 'rgba(20,12,4,.62)', color: '#fff', fontSize: 11, fontWeight: 600, backdropFilter: 'blur(3px)' }}>Đang đọc · tr. {item.lastPage}</div>
                    )}
                  </div>
                  <div style={{ marginTop: 13 }}>
                    <div className="serif" style={{ fontSize: 17.5, fontWeight: 500, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, color: 'var(--muted)', fontSize: 12.5 }}>
                      <span>{item.localStorageId ? 'Đã lưu' : 'Từ liên kết'}</span>
                      <span>·</span>
                      <span>{pages ? `${pages} trang` : 'PDF'}</span>
                    </div>
                  </div>
                </div>
                {item.localStorageId && (
                  <button onClick={(e) => deleteStored(e, item)} title="Xóa khỏi bộ nhớ" style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, border: 'none', borderRadius: 8, background: 'rgba(20,12,4,.55)', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>{Ico.trash(15)}</button>
                )}
              </div>
            );
          })}

          <div onClick={() => { setShowUpload(true); setUrlError(''); }} style={{ cursor: 'pointer' }}>
            <div style={{ aspectRatio: '3 / 4.05', borderRadius: 6, border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--muted)', background: 'color-mix(in srgb, var(--surface) 60%, transparent)' }}>
              {Ico.plus(30)}
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>Tải PDF lên</span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12.5, marginTop: 56, opacity: .7 }}>© 2026 lifebow • v{version}</div>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div onClick={() => setShowUpload(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(40,28,14,.42)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, background: 'var(--surface)', borderRadius: 18, padding: 30, boxShadow: '0 30px 80px rgba(40,25,10,.4)', animation: 'lb-fade .25s both' }}>
            <h2 className="serif" style={{ fontWeight: 500, fontSize: 25, margin: '0 0 6px' }}>Tải tài liệu PDF</h2>
            <p style={{ margin: '0 0 22px', color: 'var(--muted)', fontSize: 14.5 }}>Chọn một file PDF từ máy của bạn để bắt đầu đọc.</p>
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 34, borderRadius: 14, border: '2px dashed var(--border)', cursor: 'pointer', color: 'var(--muted)', textAlign: 'center' }}>
              <span style={{ color: 'var(--accent)' }}>{Ico.upload(30)}</span>
              <span style={{ fontSize: 14.5, color: 'var(--ink)', fontWeight: 500 }}>Nhấn để chọn file, hoặc kéo thả vào đây</span>
              <span style={{ fontSize: 12.5 }}>Chỉ hỗ trợ .pdf</span>
              <input type="file" accept="application/pdf" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0', color: 'var(--muted)', fontSize: 12.5 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span>hoặc mở từ link</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <div style={{ display: 'flex', gap: 9 }}>
              <input value={urlInput} onChange={e => { setUrlInput(e.target.value); setUrlError(''); }} onKeyDown={e => { if (e.key === 'Enter') openUrl(); }} placeholder="Dán link PDF (https://…)" style={{ flex: 1, height: 44, padding: '0 14px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg)', outline: 'none', fontSize: 14, color: 'var(--ink)' }} />
              <button onClick={openUrl} style={{ height: 44, padding: '0 20px', borderRadius: 11, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>Mở</button>
            </div>
            {urlError && <div style={{ marginTop: 10, color: '#C0522E', fontSize: 12.5 }}>{urlError}</div>}

            <button onClick={() => setShowUpload(false)} style={{ marginTop: 18, width: '100%', height: 44, borderRadius: 11, border: '1px solid var(--border)', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14.5, fontWeight: 500 }}>Hủy</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
