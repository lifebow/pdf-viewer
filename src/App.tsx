import React, { useState, useEffect } from 'react';
import { FileText, Link as LinkIcon, ExternalLink, Moon, Sun, Clock, Trash2, Edit3, Check, X, HardDrive, Lock, Unlock } from 'lucide-react';
import PdfViewer from './components/PdfViewer';
import { version } from '../package.json';
import { savePdf, getPdf, deletePdf, getStorageStats, clearAllPdfs, formatFileSize } from './utils/pdfStorage';
import type { StorageStats } from './utils/pdfStorage';

interface HistoryItem {
  url: string;
  name: string;
  lastPage: number;
  numPages: number;
  lastViewed: string;
  localStorageId?: string;
}

function App() {
  const [url, setUrl] = useState('');
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const [pdfHistory, setPdfHistory] = useState<HistoryItem[]>([]);
  const [renamingUrl, setRenamingUrl] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [activeBlobUrls, setActiveBlobUrls] = useState<Map<string, string>>(new Map()); // localStorageId -> blobUrl
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isStorageLocked, setIsStorageLocked] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('pdf_history');
    if (stored) {
      setPdfHistory(JSON.parse(stored));
    }
  }, [viewUrl]);

  // Initialize: restore blob URLs from IndexedDB and load storage stats
  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem('pdf_history');
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
              }
            } catch (e) {
              console.error('Failed to restore PDF:', e);
            }
          }
        }

        setActiveBlobUrls(newBlobUrls);
      }

      // Load storage stats & Cleanup orphans
      try {
        const stats = await getStorageStats();
        setStorageStats(stats);

        const currentHistory = localStorage.getItem('pdf_history');
        const historyData: HistoryItem[] = currentHistory ? JSON.parse(currentHistory) : [];

        // Garbage Collection: Remove files in IndexedDB NOT in history
        const historyIds = new Set(historyData.map(item => item.localStorageId).filter(Boolean));
        for (const file of stats.files) {
          if (!historyIds.has(file.id)) {
            console.log(`GC: Removing orphaned file ${file.id} (${file.name})`);
            await deletePdf(file.id);
          }
        }

        // Refresh stats after GC
        if (stats.files.length > historyIds.size) {
          const finalStats = await getStorageStats();
          setStorageStats(finalStats);
        }
      } catch (e) {
        console.error('Initial storage check failed:', e);
      }
    };

    init();

    // Cleanup: Revoke all active blob URLs on unmount
    return () => {
      activeBlobUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleView = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      setViewUrl(url);
    }
  };

  const processFile = async (file: File) => {
    if (file && file.type === 'application/pdf') {
      // 1. Check for duplicates (Simple heuristic: name + size)
      const existingFile = storageStats?.files.find(f => f.name === file.name && f.size === file.size);

      if (existingFile) {
        console.log('Reusing existing file from storage:', existingFile.id);
        const pdf = await getPdf(existingFile.id);
        if (pdf) {
          const objectUrl = URL.createObjectURL(pdf.blob);
          setActiveBlobUrls(prev => new Map(prev).set(existingFile.id, objectUrl));
          setViewUrl(objectUrl);
          sessionStorage.setItem('pending_localStorageId', existingFile.id);
          return;
        }
      }

      const arrayBuffer = await file.arrayBuffer();
      const localStorageId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        await savePdf(localStorageId, arrayBuffer, file.name);

        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(blob);

        setActiveBlobUrls(prev => new Map(prev).set(localStorageId, objectUrl));
        setViewUrl(objectUrl);

        // Update storage stats
        const stats = await getStorageStats();
        setStorageStats(stats);

        // Store the localStorageId temporarily so PdfViewer can use it
        sessionStorage.setItem('pending_localStorageId', localStorageId);
      } catch (err) {
        console.error('Failed to save PDF:', err);
        // Fallback to just using blob URL
        const objectUrl = URL.createObjectURL(file);
        setViewUrl(objectUrl);
      }
    } else {
      alert("Vui lòng chỉ chọn hoặc kéo thả file PDF.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're actually leaving the window
    if (e.relatedTarget === null) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const isBlobUrl = (url: string) => url.startsWith('blob:');

  const handleRecentClick = (item: HistoryItem) => {
    if (renamingUrl) return;

    // Check if this is a local file with IndexedDB storage
    if (item.localStorageId) {
      const blobUrl = activeBlobUrls.get(item.localStorageId);
      if (blobUrl) {
        setUrl(blobUrl);
        setViewUrl(blobUrl);
        return;
      } else {
        alert("Không thể mở file. Có thể file đã bị xóa. Vui lòng tải lại.");
        return;
      }
    }

    // For remote URLs or legacy blob URLs
    if (isBlobUrl(item.url)) {
      alert("File local cũ không còn khả dụng. Vui lòng tải lại file.");
      return;
    }

    setUrl(item.url);
    setViewUrl(item.url);
  };

  const handleDeleteHistory = async (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();

    // Delete from IndexedDB if it's a local file
    if (item.localStorageId) {
      try {
        // Revoke Blob URL if active
        const activeUrl = activeBlobUrls.get(item.localStorageId);
        if (activeUrl) {
          URL.revokeObjectURL(activeUrl);
          setActiveBlobUrls(prev => {
            const next = new Map(prev);
            next.delete(item.localStorageId!);
            return next;
          });
        }

        await deletePdf(item.localStorageId);
        // Update storage stats
        const stats = await getStorageStats();
        setStorageStats(stats);
      } catch (err) {
        console.error('Failed to delete PDF from storage:', err);
      }
    }

    const newHistory = pdfHistory.filter(h => h.url !== item.url);
    setPdfHistory(newHistory);
    localStorage.setItem('pdf_history', JSON.stringify(newHistory));
  };

  const handleClearAllStorage = async () => {
    if (!confirm('Xóa tất cả file đã lưu? Hành động này không thể hoàn tác.')) return;

    try {
      // Revoke all active blob URLs
      activeBlobUrls.forEach(url => URL.revokeObjectURL(url));
      setActiveBlobUrls(new Map());

      await clearAllPdfs();
      setStorageStats({ files: [], totalSize: 0 });

      // Remove local items from history
      const newHistory = pdfHistory.filter(item => !item.localStorageId);
      setPdfHistory(newHistory);
      localStorage.setItem('pdf_history', JSON.stringify(newHistory));
    } catch (err) {
      console.error('Failed to clear storage:', err);
    }
  };

  const handleDeleteStorageFile = (fileId: string) => {
    (async () => {
      try {
        // Revoke Blob URL if active
        const activeUrl = activeBlobUrls.get(fileId);
        if (activeUrl) {
          URL.revokeObjectURL(activeUrl);
          setActiveBlobUrls(prev => {
            const next = new Map(prev);
            next.delete(fileId);
            return next;
          });
        }

        await deletePdf(fileId);
        const stats = await getStorageStats();
        setStorageStats(stats);
        const newHistory = pdfHistory.filter(h => h.localStorageId !== fileId);
        setPdfHistory(newHistory);
        localStorage.setItem('pdf_history', JSON.stringify(newHistory));
      } catch (err) {
        console.error('Failed to delete file:', err);
      }
    })();
  };

  const startRenaming = (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    setRenamingUrl(item.url);
    setEditName(item.name);
  };

  const saveRename = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    if (!renamingUrl || !editName.trim()) {
      setRenamingUrl(null);
      return;
    }

    const newHistory = pdfHistory.map(item =>
      item.url === renamingUrl ? { ...item, name: editName.trim() } : item
    );
    setPdfHistory(newHistory);
    localStorage.setItem('pdf_history', JSON.stringify(newHistory));
    setRenamingUrl(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingUrl(null);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  if (viewUrl) {
    return <PdfViewer key={viewUrl} url={viewUrl} onBack={() => {
      // Don't revoke blob URLs here - keep them valid for re-opening within the session
      setViewUrl(null);
    }} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />;
  }

  return (
    <div
      className={`app-landing-container ${isDragging ? 'is-dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drop-overlay">
          <div className="drop-content">
            <div className="drop-icon-wrapper">
              <FileText size={64} />
            </div>
            <h2>Thả file để đọc ngay</h2>
            <p>Hỗ trợ tất cả các file PDF</p>
          </div>
        </div>
      )}
      <nav className="landing-nav">
        <div className="nav-brand">
          <img src="/logo.svg" alt="Logo" className="brand-icon" style={{ height: '28px', width: '28px', objectFit: 'contain' }} />
          <span className="brand-name">PDF Viewer</span>
        </div>
        <button
          onClick={toggleTheme}
          className="btn-icon theme-toggle"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </nav>

      <main className="landing-grid">
        <div className="landing-main-col">
          <header className="hero-section">
            <h1 className="hero-title">
              Trải nghiệm <span className="text-gradient">PDF</span> Mượt mà
            </h1>
            <p className="hero-subtitle">
              Đọc, quản lý và lưu trữ tài liệu PDF của bạn với tốc độ cao và bảo mật tuyệt đối.
              Không cần tải lên server, mọi thứ hoạt động ngay trên trình duyệt.
            </p>
          </header>

          <form onSubmit={handleView} className="glass action-card">
            <div className="input-group">
              <LinkIcon className="input-icon" size={20} />
              <input
                type="url"
                className="modern-input"
                placeholder="Dán đường dẫn PDF (https://...)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="action-buttons">
              <button type="submit" className="btn-primary large-btn">
                Xem Ngay <ExternalLink size={20} />
              </button>
              <div className="divider">hoặc</div>
              <label className="btn-outline large-btn file-upload-btn">
                <FileText size={20} /> Tải file lên
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </form>

          {pdfHistory.length > 0 && (
            <div className="history-section">
              <h2 className="section-header">
                <Clock size={20} /> Mở gần đây
              </h2>
              <div className="history-grid">
                {pdfHistory.slice(0, 12).map((item, idx) => {
                  const hasLocalStorage = !!item.localStorageId;
                  const isAvailable = hasLocalStorage ? activeBlobUrls.has(item.localStorageId!) : !isBlobUrl(item.url);

                  return (
                    <div
                      key={idx}
                      className={`history-card glass ${renamingUrl === item.url ? 'renaming' : ''} ${hasLocalStorage ? 'is-local' : ''}`}
                      onClick={() => handleRecentClick(item)}
                    >
                      <div className="card-icon">
                        <FileText size={24} />
                      </div>
                      <div className="card-content">
                        {renamingUrl === item.url ? (
                          <input
                            autoFocus
                            className="rename-input-compact"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="card-title" title={item.name}>{item.name}</div>
                        )}
                        <div className="card-meta">
                          {hasLocalStorage && (
                            <span className={`status-badge ${isAvailable ? 'success' : 'error'}`}>
                              {isAvailable ? 'Đã lưu' : 'Mất file'}
                            </span>
                          )}
                          <span>{formatTime(item.lastViewed)}</span>
                        </div>
                      </div>

                      <div className="card-actions">
                        {renamingUrl === item.url ? (
                          <>
                            <button onClick={saveRename} className="icon-btn success"><Check size={16} /></button>
                            <button onClick={cancelRename} className="icon-btn danger"><X size={16} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={(e) => startRenaming(e, item)} className="icon-btn"><Edit3 size={16} /></button>
                            <button onClick={(e) => handleDeleteHistory(e, item)} className="icon-btn danger"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <aside className="landing-sidebar">
          {storageStats && (
            <div className="glass storage-widget">
              <div className="widget-header">
                <div className="header-left">
                  <HardDrive size={20} className="text-primary" />
                  <h3>Bộ nhớ lưu trữ</h3>
                </div>
                <button
                  onClick={() => setIsStorageLocked(!isStorageLocked)}
                  className={`btn-icon ${isStorageLocked ? 'text-primary' : 'text-muted'}`}
                  title={isStorageLocked ? "Mở khóa để xóa" : "Khóa để bảo vệ"}
                >
                  {isStorageLocked ? <Lock size={18} /> : <Unlock size={18} />}
                </button>
              </div>
              <div className="storage-meter">
                <div className="meter-label">
                  <span>Đã dùng</span>
                  <strong>{formatFileSize(storageStats.totalSize)}</strong>
                </div>
                {(() => {
                  const MAX_STORAGE_QUOTA = 50 * 1024 * 1024; // 50MB
                  const percentage = Math.min(100, Math.max(1, (storageStats.totalSize / MAX_STORAGE_QUOTA) * 100));

                  let meterColor = 'var(--primary)';
                  if (percentage > 90) meterColor = '#ef4444'; // Red
                  else if (percentage > 70) meterColor = '#f59e0b'; // Orange/Yellow

                  return (
                    <div className="meter-bar">
                      <div
                        className="meter-fill"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: meterColor,
                          boxShadow: `0 0 10px ${meterColor}40`
                        }}
                      ></div>
                    </div>
                  );
                })()}
              </div>

              {storageStats.files.length > 0 ? (
                <div className="file-list-compact">
                  {storageStats.files.map((file, idx) => (
                    <div key={idx} className="file-row">
                      <div className="file-info">
                        <FileText size={14} className="text-muted" />
                        <span className="file-name">{file.name}</span>
                      </div>
                      <div className="file-actions">
                        <span className="file-size">{formatFileSize(file.size)}</span>
                        <button
                          onClick={() => !isStorageLocked && handleDeleteStorageFile(file.id)}
                          className={`delete-icon-btn ${isStorageLocked ? 'disabled' : ''}`}
                          title={isStorageLocked ? "Đang khóa" : "Xóa"}
                          disabled={isStorageLocked}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handleClearAllStorage}
                    className={`btn-text-danger full-width mt-2 ${isStorageLocked ? 'disabled' : ''}`}
                    disabled={isStorageLocked}
                  >
                    Xóa tất cả dữ liệu
                  </button>
                </div>
              ) : (
                <div className="empty-state">
                  Chưa có file nào được lưu
                </div>
              )}
            </div>
          )}

          <div className="footer-links">
            © 2026 lifebow • v{version}
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
