import React, { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, ArrowLeft, Download, Moon, Sun, Search, X, List, Layout, Maximize } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker URL for pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
    url: string;
    onBack: () => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ url, onBack, isDarkMode, toggleTheme }) => {
    const getProxiedUrl = (originalUrl: string) => {
        if (!originalUrl.startsWith('http')) return originalUrl;
        if (originalUrl.startsWith('blob:')) return originalUrl;
        try {
            const urlObj = new URL(originalUrl);
            if (urlObj.hostname === window.location.hostname) return originalUrl;
            return `https://steep-union-ca07.artmoney306.workers.dev/?url=${encodeURIComponent(originalUrl)}`;
        } catch (e) {
            return originalUrl;
        }
    };

    const proxiedUrl = getProxiedUrl(url);

    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [rotation, setRotation] = useState(0);
    const [pagesToShow, setPagesToShow] = useState(1);
    const [inputPage, setInputPage] = useState('1');
    const [viewMode, setViewMode] = useState<'paginated' | 'scroll'>('paginated');
    const [isFitWidth, setIsFitWidth] = useState(false);
    const [pdfTheme, setPdfTheme] = useState<'light' | 'dark' | 'sepia' | 'night'>('light');

    // Search states
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [pagesText, setPagesText] = useState<string[]>([]);
    const [searchResults, setSearchResults] = useState<number[]>([]); // Array of page numbers
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

    const containerRef = React.useRef<HTMLDivElement>(null);
    const pageOriginalWidthRef = React.useRef<number | null>(null);

    const calculateFitWidthScale = useCallback(() => {
        if (!containerRef.current || !pageOriginalWidthRef.current) return;

        const container = containerRef.current;
        const containerWidth = container.clientWidth - 64; // Horizontal padding

        const newScale = containerWidth / pageOriginalWidthRef.current;
        setScale(newScale);
    }, []);

    useEffect(() => {
        if (isFitWidth) {
            calculateFitWidthScale();
        }
    }, [isFitWidth, calculateFitWidthScale, pagesToShow, viewMode, numPages]);

    useEffect(() => {
        if (!isFitWidth) return;

        const handleResize = () => {
            calculateFitWidthScale();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isFitWidth, calculateFitWidthScale]);

    const scrollToPage = useCallback((pageNum: number) => {
        if (viewMode === 'scroll' && containerRef.current) {
            const pageElement = containerRef.current.querySelector(`[data-page-number="${pageNum}"]`);
            if (pageElement) {
                pageElement.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [viewMode]);

    const changePage = useCallback((offset: number) => {
        setPageNumber(prev => {
            const next = Math.min(Math.max(1, prev + offset), numPages || 1);
            setInputPage(next.toString());
            if (viewMode === 'scroll') {
                scrollToPage(next);
            }
            return next;
        });
    }, [numPages, viewMode, scrollToPage]);

    const handleGoToPage = (e: React.FormEvent) => {
        e.preventDefault();
        const page = parseInt(inputPage);
        if (!isNaN(page) && page >= 1 && page <= (numPages || 1)) {
            setPageNumber(page);
            if (viewMode === 'scroll') {
                scrollToPage(page);
            }
        } else {
            setInputPage(pageNumber.toString());
        }
    };

    // Scroll listener to update pageNumber in scroll mode
    useEffect(() => {
        const container = containerRef.current;
        if (!container || viewMode !== 'scroll') return;

        const handleScroll = () => {
            const pages = container.querySelectorAll('.pdf-page-wrapper');
            let currentPage = 1;
            let minDistance = Infinity;

            pages.forEach((page) => {
                const rect = page.getBoundingClientRect();
                const distance = Math.abs(rect.top);
                if (distance < minDistance) {
                    minDistance = distance;
                    const p = page.getAttribute('data-page-number');
                    if (p) currentPage = parseInt(p);
                }
            });

            if (currentPage !== pageNumber) {
                setPageNumber(currentPage);
                setInputPage(currentPage.toString());
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [viewMode, pageNumber]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Arrow keys for page navigation
            if (e.key === 'ArrowLeft') {
                changePage(-pagesToShow);
            } else if (e.key === 'ArrowRight') {
                changePage(pagesToShow);
            }
            // Ctrl+Shift+F for search
            else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.code === 'KeyF' || e.key.toLowerCase() === 'f')) {
                e.preventDefault();
                setIsSearching(true);
            }
            // Escape to close search
            else if (e.key === 'Escape' && isSearching) {
                setIsSearching(false);
                setSearchTerm('');
                setSearchResults([]);
            }
        };
        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [changePage, isSearching, pagesToShow]);

    const onDocumentLoadSuccess = async (pdf: any) => {
        setNumPages(pdf.numPages);
        setPageNumber(1);
        setInputPage('1');

        if (isFitWidth) {
            setTimeout(calculateFitWidthScale, 500);
        }

        // Extract text from all pages
        const texts: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item: any) => (item as any).str).join(' ');
            texts.push(pageText.toLowerCase());
        }
        setPagesText(texts);
    };

    const onPageLoadSuccess = (page: any) => {
        const { width } = page.getViewport({ scale: 1 });
        pageOriginalWidthRef.current = width;
        if (isFitWidth) {
            calculateFitWidthScale();
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value.toLowerCase();
        setSearchTerm(term);

        if (term.length < 2) {
            setSearchResults([]);
            setCurrentMatchIndex(-1);
            return;
        }

        const results: number[] = [];
        pagesText.forEach((text, index) => {
            if (text.includes(term)) {
                results.push(index + 1);
            }
        });
        setSearchResults(results);
        if (results.length > 0) {
            setCurrentMatchIndex(0);
            setPageNumber(results[0]);
            setInputPage(results[0].toString());
            if (viewMode === 'scroll') {
                scrollToPage(results[0]);
            }
        } else {
            setCurrentMatchIndex(-1);
        }
    };

    const navigateMatch = (direction: number) => {
        if (searchResults.length === 0) return;
        const nextIndex = (currentMatchIndex + direction + searchResults.length) % searchResults.length;
        setCurrentMatchIndex(nextIndex);
        setPageNumber(searchResults[nextIndex]);
        setInputPage(searchResults[nextIndex].toString());
        if (viewMode === 'scroll') {
            scrollToPage(searchResults[nextIndex]);
        }
    };

    const highlightMatches = useCallback(() => {
        if (!searchTerm || searchTerm.length < 2) return;

        const highlight = () => {
            const textLayers = document.querySelectorAll('.react-pdf__Page__textContent');
            textLayers.forEach(textLayer => {
                const textItems = textLayer.querySelectorAll('span');
                if (textItems.length > 0) {
                    textItems.forEach(item => {
                        const text = item.textContent || '';
                        if (text.toLowerCase().includes(searchTerm.toLowerCase())) {
                            const regex = new RegExp(`(${searchTerm})`, 'gi');
                            item.innerHTML = text.replace(regex, '<mark class="search-match">$1</mark>');
                        }
                    });
                }
            });
        };

        if (viewMode === 'paginated') {
            setTimeout(highlight, 200);
        } else {
            setTimeout(highlight, 500);
        }
    }, [searchTerm, viewMode]);

    useEffect(() => {
        if (isSearching && searchTerm && searchTerm.length >= 2) {
            highlightMatches();
        }
    }, [searchTerm, isSearching, highlightMatches, pageNumber, viewMode]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--pdf-bg)' }}>
            {/* Navbar / Toolbar */}
            <nav className="glass" style={{ margin: '1rem', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={onBack} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowLeft size={18} /> Quay lại
                    </button>
                    <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }}></div>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {url.split('/').pop()}
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {/* Search Controls */}
                    <div className="glass" style={{ display: 'flex', alignItems: 'center', padding: '0 8px', gap: '4px' }}>
                        {!isSearching ? (
                            <button
                                onClick={() => setIsSearching(true)}
                                className="btn-secondary"
                                style={{ border: 'none', background: 'none' }}
                                title="Tìm kiếm (Ctrl+Shift+F)"
                                data-testid="search-button"
                            >
                                <Search size={20} />
                            </button>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    autoFocus
                                    className="input-field"
                                    style={{ width: '150px', height: '32px', padding: '4px 12px', fontSize: '0.9rem' }}
                                    placeholder="Tìm cụm từ..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                    data-testid="search-input"
                                />
                                {searchResults.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        <span>{currentMatchIndex + 1}/{searchResults.length}</span>
                                        <button onClick={() => navigateMatch(-1)} className="btn-secondary" style={{ padding: '2px' }}><ChevronLeft size={16} /></button>
                                        <button onClick={() => navigateMatch(1)} className="btn-secondary" style={{ padding: '2px' }}><ChevronRight size={16} /></button>
                                    </div>
                                )}
                                <button onClick={() => { setIsSearching(false); setSearchTerm(''); setSearchResults([]); }} className="btn-secondary" style={{ border: 'none', background: 'none' }}>
                                    <X size={18} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 8px' }}>
                        <button onClick={() => changePage(-pagesToShow)} disabled={pageNumber <= 1} className="btn-secondary" style={{ padding: '6px' }} title="Trang trước"><ChevronLeft size={20} /></button>

                        <form onSubmit={handleGoToPage} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                type="text"
                                value={inputPage}
                                onChange={(e) => setInputPage(e.target.value)}
                                onBlur={() => setInputPage(pageNumber.toString())}
                                style={{ width: '40px', textAlign: 'center', border: 'none', background: 'var(--glass-bg)', color: 'var(--text-main)', borderRadius: '4px', padding: '2px 4px', fontWeight: 600 }}
                            />
                            <span style={{ color: 'var(--text-muted)' }}>/ {numPages || '--'}</span>
                        </form>

                        <button onClick={() => changePage(pagesToShow)} disabled={pageNumber >= (numPages || 0)} className="btn-secondary" style={{ padding: '6px' }} title="Trang sau"><ChevronRight size={20} /></button>

                        <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 8px' }}></div>

                        <button
                            onClick={() => setViewMode(viewMode === 'paginated' ? 'scroll' : 'paginated')}
                            className="btn-secondary"
                            style={{ padding: '6px' }}
                            title={viewMode === 'paginated' ? "Chế độ cuộn dọc" : "Chế độ chuyển trang"}
                        >
                            {viewMode === 'paginated' ? <List size={20} /> : <Layout size={20} />}
                        </button>

                        {viewMode === 'paginated' && (
                            <>
                                <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 8px' }}></div>
                                <select
                                    value={pagesToShow}
                                    onChange={(e) => setPagesToShow(parseInt(e.target.value))}
                                    className="btn-secondary"
                                    style={{ padding: '4px 8px', fontSize: '0.8rem', outline: 'none' }}
                                    title="Số trang hiển thị"
                                >
                                    <option value={1}>1 trang</option>
                                    <option value={2}>2 trang</option>
                                    <option value={3}>3 trang</option>
                                </select>
                            </>
                        )}

                        <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 8px' }}></div>

                        <button onClick={() => { setScale(s => Math.max(0.5, s - 0.1)); setIsFitWidth(false); }} className="btn-secondary" style={{ padding: '6px' }} title="Thu nhỏ"><ZoomOut size={18} /></button>
                        <span style={{ minWidth: '70px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 600 }}>
                            {isNaN(scale) || !isFinite(scale) ? '100' : Math.round(scale * 100)}%
                        </span>
                        <button onClick={() => { setScale(s => Math.min(2.5, s + 0.1)); setIsFitWidth(false); }} className="btn-secondary" style={{ padding: '6px' }} title="Phóng to"><ZoomIn size={18} /></button>

                        <button
                            onClick={() => {
                                const nextFit = !isFitWidth;
                                setIsFitWidth(nextFit);
                                if (nextFit) {
                                    setRotation(0);
                                    setPagesToShow(1);
                                }
                            }}
                            className={`btn-secondary ${isFitWidth ? 'active' : ''}`}
                            style={{ padding: '6px', color: isFitWidth ? '#3b82f6' : 'inherit', background: isFitWidth ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}
                            title="Tự động giãn ngang"
                        >
                            <Maximize size={18} />
                        </button>

                        <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 8px' }}></div>

                        <select
                            value={pdfTheme}
                            onChange={(e) => setPdfTheme(e.target.value as any)}
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.8rem', outline: 'none' }}
                            title="Màu nền PDF"
                        >
                            <option value="light">Trang trắng</option>
                            <option value="dark">Thông minh (Dark)</option>
                            <option value="sepia">Sepia (Cổ điển)</option>
                            <option value="night">Night (Dịu mắt)</option>
                        </select>

                        <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 8px' }}></div>

                        <button onClick={toggleTheme} className="btn-secondary" style={{ padding: '6px' }}>
                            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 8px' }}></div>

                        <button onClick={() => { setRotation(r => (r + 90) % 360); if (isFitWidth) setTimeout(calculateFitWidthScale, 100); }} className="btn-secondary" style={{ padding: '6px' }} title="Xoay trang"><RotateCw size={18} /></button>
                    </div>
                </div>

                <button onClick={() => window.open(url, '_blank')} className="btn-primary" style={{ padding: '8px 16px' }}>
                    Tải xuống <Download size={18} />
                </button>
            </nav>

            {/* PDF Container */}
            <div ref={containerRef} style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Document
                    file={proxiedUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={<div style={{ padding: '2rem' }}>Đang tải tài liệu...</div>}
                    error={<div style={{ color: '#ef4444', padding: '2rem' }}>Không thể tải PDF. Vui lòng kiểm tra lại link hoặc quyền truy cập.</div>}
                >
                    {viewMode === 'paginated' ? (
                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'nowrap' }}>
                            {Array.from({ length: pagesToShow }).map((_, i) => {
                                const p = pageNumber + i;
                                if (p > (numPages || 0)) return null;
                                return (
                                    <Page
                                        key={`${p}-${searchTerm}-${scale}-${rotation}`}
                                        pageNumber={p}
                                        scale={scale}
                                        rotate={rotation}
                                        className="pdf-page shadow"
                                        renderAnnotationLayer={true}
                                        renderTextLayer={true}
                                        onLoadSuccess={i === 0 ? onPageLoadSuccess : undefined}
                                        onRenderTextLayerSuccess={i === 0 ? highlightMatches : undefined}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
                            {Array.from({ length: numPages || 0 }).map((_, i) => (
                                <div key={i + 1} data-page-number={i + 1} className="pdf-page-wrapper">
                                    <Page
                                        pageNumber={i + 1}
                                        scale={scale}
                                        rotate={rotation}
                                        className="pdf-page shadow"
                                        renderAnnotationLayer={true}
                                        renderTextLayer={true}
                                        onLoadSuccess={i === 0 ? onPageLoadSuccess : undefined}
                                        onRenderTextLayerSuccess={highlightMatches}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </Document>
            </div>

            <style>{`
        .pdf-page {
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          border-radius: 4px;
          background: white;
          transition: filter 0.3s ease;
          ${pdfTheme === 'dark' ? 'filter: invert(1) hue-rotate(180deg);' : ''}
          ${pdfTheme === 'sepia' ? 'filter: sepia(0.8) brightness(0.9) contrast(1.1);' : ''}
          ${pdfTheme === 'night' ? 'filter: invert(0.9) hue-rotate(210deg) brightness(0.8);' : ''}
        }
        .shadow {
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }
        button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        ::selection {
            background: rgba(73, 145, 226, 0.3);
        }
        .search-match {
            background-color: #ffeb3b;
            color: black;
            border-radius: 2px;
            padding: 0 1px;
        }
      `}</style>
        </div>
    );
};

export default PdfViewer;
