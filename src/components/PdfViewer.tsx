import React, { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, ArrowLeft, Download, Moon, Sun, Search, X } from 'lucide-react';
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
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [rotation, setRotation] = useState(0);

    // Search states
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [pagesText, setPagesText] = useState<string[]>([]);
    const [searchResults, setSearchResults] = useState<number[]>([]); // Array of page numbers
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

    const changePage = useCallback((offset: number) => {
        setPageNumber(prev => Math.min(Math.max(1, prev + offset), numPages || 1));
    }, [numPages]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Arrow keys for page navigation
            if (e.key === 'ArrowLeft') {
                changePage(-1);
            } else if (e.key === 'ArrowRight') {
                changePage(1);
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
    }, [changePage, isSearching]);

    const onDocumentLoadSuccess = async (pdf: any) => {
        setNumPages(pdf.numPages);
        setPageNumber(1);

        // Extract text from all pages
        const texts: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item: any) => item.str).join(' ');
            texts.push(pageText.toLowerCase());
        }
        setPagesText(texts);
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
        } else {
            setCurrentMatchIndex(-1);
        }
    };

    const navigateMatch = (direction: number) => {
        if (searchResults.length === 0) return;
        const nextIndex = (currentMatchIndex + direction + searchResults.length) % searchResults.length;
        setCurrentMatchIndex(nextIndex);
        setPageNumber(searchResults[nextIndex]);
    };

    const highlightMatches = useCallback(() => {
        if (!searchTerm || searchTerm.length < 2) return;

        const highlight = () => {
            const textLayer = document.querySelector('.react-pdf__Page__textContent');
            if (textLayer) {
                const textItems = textLayer.querySelectorAll('span');
                if (textItems.length > 0) {
                    textItems.forEach(item => {
                        const text = item.textContent || '';
                        if (text.toLowerCase().includes(searchTerm.toLowerCase())) {
                            const regex = new RegExp(`(${searchTerm})`, 'gi');
                            item.innerHTML = text.replace(regex, '<mark class="search-match">$1</mark>');
                        }
                    });
                    return true;
                }
            }
            return false;
        };

        if (!highlight()) {
            setTimeout(highlight, 200);
            setTimeout(highlight, 500);
            setTimeout(highlight, 1000);
        }
    }, [searchTerm]);

    useEffect(() => {
        if (isSearching && searchTerm && searchTerm.length >= 2) {
            highlightMatches();
        }
    }, [searchTerm, isSearching, highlightMatches, pageNumber]);

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
                        <button onClick={() => changePage(-1)} disabled={pageNumber <= 1} className="btn-secondary" style={{ padding: '6px' }}><ChevronLeft size={20} /></button>
                        <span style={{ minWidth: '70px', textAlign: 'center', fontWeight: 500 }}>
                            {pageNumber} / {numPages || '--'}
                        </span>
                        <button onClick={() => changePage(1)} disabled={pageNumber >= (numPages || 0)} className="btn-secondary" style={{ padding: '6px' }}><ChevronRight size={20} /></button>

                        <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 8px' }}></div>

                        <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="btn-secondary" style={{ padding: '6px' }}><ZoomOut size={18} /></button>
                        <span style={{ minWidth: '50px', textAlign: 'center', fontSize: '0.9rem' }}>{Math.round(scale * 100)}%</span>
                        <button onClick={() => setScale(s => Math.min(2.5, s + 0.1))} className="btn-secondary" style={{ padding: '6px' }}><ZoomIn size={18} /></button>

                        <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 8px' }}></div>

                        <button onClick={toggleTheme} className="btn-secondary" style={{ padding: '6px' }}>
                            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 8px' }}></div>

                        <button onClick={() => setRotation(r => (r + 90) % 360)} className="btn-secondary" style={{ padding: '6px' }}><RotateCw size={18} /></button>
                    </div>
                </div>

                <button onClick={() => window.open(url, '_blank')} className="btn-primary" style={{ padding: '8px 16px' }}>
                    Tải xuống <Download size={18} />
                </button>
            </nav>

            {/* PDF Container */}
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={<div style={{ padding: '2rem' }}>Đang tải tài liệu...</div>}
                    error={<div style={{ color: '#ef4444', padding: '2rem' }}>Không thể tải PDF. Vui lòng kiểm tra lại link hoặc quyền truy cập.</div>}
                >
                    <Page
                        key={`${pageNumber}-${searchTerm}-${scale}-${rotation}`}
                        pageNumber={pageNumber}
                        scale={scale}
                        rotate={rotation}
                        className="pdf-page shadow"
                        renderAnnotationLayer={true}
                        renderTextLayer={true}
                        onRenderTextLayerSuccess={highlightMatches}
                    />
                </Document>
            </div>

            <style>{`
        .pdf-page {
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          border-radius: 4px;
          background: white;
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
        /* Style for highlighted text matches - if we had a more complex highlighter */
      `}</style>
        </div>
    );
};

export default PdfViewer;
