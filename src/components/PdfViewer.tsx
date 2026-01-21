import React, { useState, useEffect, useCallback } from 'react';
import { Document, pdfjs } from 'react-pdf';
import { ChevronDown } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import Toolbar from './pdf/Toolbar';
import Sidebar from './pdf/Sidebar';
import PdfContent from './pdf/PdfContent';
// import ExtractionModal from './pdf/ExtractionModal';

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

    // PDF State
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [rotation, setRotation] = useState(0);
    const [pagesToShow, setPagesToShow] = useState(1);
    const [inputPage, setInputPage] = useState('1');
    const [viewMode, setViewMode] = useState<'paginated' | 'scroll'>('scroll');
    const [scaleMode, setScaleMode] = useState<'manual' | 'fit-width' | 'fit-page' | 'original'>('manual');
    const [pdfTheme, setPdfTheme] = useState<'light' | 'dark' | 'sepia' | 'night'>('light');
    const [isToolbarVisible, setIsToolbarVisible] = useState(true);
    const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
    const [bookmarks, setBookmarks] = useState<number[]>(() => {
        const stored = localStorage.getItem('pdf_bookmarks');
        if (stored) {
            const allBookmarks = JSON.parse(stored);
            return allBookmarks[url] || [];
        }
        return [];
    });

    // Search states
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [pagesText, setPagesText] = useState<string[]>([]);
    const [searchResults, setSearchResults] = useState<number[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

    // const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);

    const containerRef = React.useRef<HTMLDivElement>(null);
    const pageOriginalWidthRef = React.useRef<number | null>(null);
    const pageOriginalHeightRef = React.useRef<number | null>(null);

    // Save bookmarks
    useEffect(() => {
        const stored = localStorage.getItem('pdf_bookmarks');
        const allBookmarks = stored ? JSON.parse(stored) : {};
        allBookmarks[url] = bookmarks;
        localStorage.setItem('pdf_bookmarks', JSON.stringify(allBookmarks));
    }, [bookmarks, url]);

    // Auto-hide sidebar on resize if below threshold
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768 && showSidebar) {
                setShowSidebar(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [showSidebar]);

    const calculateAutoScale = useCallback(() => {
        if (!containerRef.current || !pageOriginalWidthRef.current || !pageOriginalHeightRef.current) return;
        if (scaleMode === 'manual') return;

        const container = containerRef.current;
        const containerWidth = container.clientWidth - 48;
        const containerHeight = container.clientHeight - 48;

        if (scaleMode === 'fit-width') {
            const newScale = containerWidth / pageOriginalWidthRef.current;
            setScale(newScale);
        } else if (scaleMode === 'fit-page') {
            const availableHeight = containerHeight - 100;
            const scaleW = containerWidth / pageOriginalWidthRef.current;
            const scaleH = availableHeight / pageOriginalHeightRef.current;
            setScale(Math.min(scaleW, scaleH));
        } else if (scaleMode === 'original') {
            setScale(1.0);
            setRotation(0);
            setPagesToShow(1);
            setScaleMode('manual');
        }
    }, [scaleMode, rotation, showSidebar, viewMode, pagesToShow]);

    // Sync PDF theme with app theme
    useEffect(() => {
        if (isDarkMode && pdfTheme === 'light') setPdfTheme('sepia');
        else if (!isDarkMode && pdfTheme === 'sepia') setPdfTheme('light');
    }, [isDarkMode]);

    useEffect(() => {
        if (scaleMode !== 'manual') calculateAutoScale();
    }, [scaleMode, calculateAutoScale, pagesToShow, viewMode, numPages]);

    useEffect(() => {
        if (scaleMode === 'manual') return;
        const handleResize = () => calculateAutoScale();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [scaleMode, calculateAutoScale]);

    const scrollToPage = useCallback((pageNum: number) => {
        if (viewMode === 'scroll' && containerRef.current) {
            const pageElement = containerRef.current.querySelector(`[data-page-number="${pageNum}"]`);
            if (pageElement) pageElement.scrollIntoView({ behavior: 'smooth' });
        }
    }, [viewMode]);

    const changePage = useCallback((offset: number) => {
        setPageNumber(prev => {
            const next = Math.min(Math.max(1, prev + offset), numPages || 1);
            setInputPage(next.toString());
            if (viewMode === 'scroll') scrollToPage(next);
            return next;
        });
    }, [numPages, viewMode, scrollToPage]);

    const handleGoToPage = (e: React.FormEvent) => {
        e.preventDefault();
        const page = parseInt(inputPage);
        if (!isNaN(page) && page >= 1 && page <= (numPages || 1)) {
            setPageNumber(page);
            if (viewMode === 'scroll') scrollToPage(page);
        } else {
            setInputPage(pageNumber.toString());
        }
    };

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
            if (e.key === 'ArrowLeft') changePage(-pagesToShow);
            else if (e.key === 'ArrowRight') changePage(pagesToShow);
            else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.code === 'KeyF' || e.key.toLowerCase() === 'f')) {
                e.preventDefault();
                setIsSearching(true);
            } else if (e.key === 'Escape' && isSearching) {
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

        // Check if we should resume from previous session
        const stored = localStorage.getItem('pdf_history');
        if (stored) {
            const history = JSON.parse(stored);
            const entry = history.find((h: any) => h.url === url);
            if (entry && entry.lastPage > 1 && entry.lastPage <= pdf.numPages) {
                setPageNumber(entry.lastPage);
                setInputPage(entry.lastPage.toString());
                if (viewMode === 'scroll') setTimeout(() => scrollToPage(entry.lastPage), 500);
                //scroll sidebar to 
            }
        }

        if (scaleMode !== 'manual') setTimeout(calculateAutoScale, 500);

        // Extract text from all pages asynchronously to avoid blocking UI
        const texts: string[] = [];
        const extractText = async (start: number) => {
            const end = Math.min(start + 5, pdf.numPages);
            for (let i = start; i <= end; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const pageText = content.items.map((item: any) => (item as any).str).join(' ');
                texts[i - 1] = pageText.toLowerCase();
            }
            if (end < pdf.numPages) {
                setTimeout(() => extractText(end + 1), 50);
            } else {
                setPagesText([...texts]);
            }
        };
        extractText(1);
    };

    const onPageLoadSuccess = (page: any) => {
        const { width, height } = page.getViewport({ scale: 1 });
        pageOriginalWidthRef.current = width;
        pageOriginalHeightRef.current = height;
        if (scaleMode !== 'manual') calculateAutoScale();
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
            if (text.includes(term)) results.push(index + 1);
        });
        setSearchResults(results);
        if (results.length > 0) {
            setCurrentMatchIndex(0);
            setPageNumber(results[0]);
            setInputPage(results[0].toString());
            if (viewMode === 'scroll') scrollToPage(results[0]);
        } else {
            setCurrentMatchIndex(-1);
        }
    };

    const navigateMatch = (direction: number) => {
        if (searchResults.length === 0) return;
        setSearchResults(prev => {
            setCurrentMatchIndex(curr => {
                const nextIndex = (curr + direction + prev.length) % prev.length;
                const nextPage = prev[nextIndex];
                setPageNumber(nextPage);
                setInputPage(nextPage.toString());
                if (viewMode === 'scroll') scrollToPage(nextPage);
                return nextIndex;
            });
            return prev;
        });
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
        setTimeout(highlight, viewMode === 'paginated' ? 200 : 500);
    }, [searchTerm, viewMode]);

    // Track history and last page
    useEffect(() => {
        if (!url || !numPages) return;
        const saveHistory = () => {
            const stored = localStorage.getItem('pdf_history');
            let history = stored ? JSON.parse(stored) : [];

            const existingIndex = history.findIndex((item: any) => item.url === url);

            // Get file name: use existing name, or generate from URL
            const fileName = existingIndex > -1
                ? history[existingIndex].name
                : (url.split('/').pop()?.split('?')[0] || 'Tài liệu không tên');

            // Check if there's a pending localStorageId from a recent upload
            const pendingId = sessionStorage.getItem('pending_localStorageId');
            const localStorageId = existingIndex > -1
                ? history[existingIndex].localStorageId
                : pendingId || undefined;

            // Clear the pending ID after using it
            if (pendingId) {
                sessionStorage.removeItem('pending_localStorageId');
            }

            const entry = {
                url,
                name: fileName,
                lastPage: pageNumber,
                numPages,
                lastViewed: new Date().toISOString(),
                localStorageId,
            };

            if (existingIndex > -1) {
                history[existingIndex] = entry;
            } else {
                history.unshift(entry);
                if (history.length > 20) history.pop();
            }
            localStorage.setItem('pdf_history', JSON.stringify(history));
        };

        const timer = setTimeout(saveHistory, 1000);
        return () => clearTimeout(timer);
    }, [pageNumber, url, numPages]);

    useEffect(() => {
        if (isSearching && searchTerm && searchTerm.length >= 2) highlightMatches();
    }, [searchTerm, isSearching, highlightMatches, pageNumber, viewMode]);

    const toggleBookmark = (page: number) => {
        setBookmarks(prev =>
            prev.includes(page)
                ? prev.filter(p => p !== page)
                : [...prev, page].sort((a, b) => a - b)
        );
    };


    return (
        <div className="pdf-viewer-root">
            {isToolbarVisible ? (
                <Toolbar
                    url={url}
                    onBack={onBack}
                    showSidebar={showSidebar}
                    setShowSidebar={setShowSidebar}
                    isSearching={isSearching}
                    setIsSearching={setIsSearching}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    handleSearch={handleSearch}
                    searchResults={searchResults}
                    setSearchResults={setSearchResults}
                    currentMatchIndex={currentMatchIndex}
                    navigateMatch={navigateMatch}
                    changePage={changePage}
                    pageNumber={pageNumber}
                    numPages={numPages}
                    inputPage={inputPage}
                    setInputPage={setInputPage}
                    handleGoToPage={handleGoToPage}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    pagesToShow={pagesToShow}
                    setPagesToShow={setPagesToShow}
                    scale={scale}
                    setScale={setScale}
                    scaleMode={scaleMode}
                    setScaleMode={setScaleMode}
                    pdfTheme={pdfTheme}
                    setPdfTheme={setPdfTheme}
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                    setRotation={setRotation}
                    setIsToolbarVisible={setIsToolbarVisible}
                    calculateAutoScale={calculateAutoScale}
                    bookmarks={bookmarks}
                    onToggleBookmark={toggleBookmark}
                />
            ) : (
                <button
                    onClick={() => setIsToolbarVisible(true)}
                    className="btn-secondary glass fade-in floating-show-btn"
                >
                    <ChevronDown size={18} /> <span className="nav-label">Hiện thanh công cụ</span>
                </button>
            )}

            <div className="pdf-main-area">
                <Document
                    file={proxiedUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={<div className="document-status">Đang tải tài liệu...</div>}
                    error={<div className="document-status error">Không thể tải PDF.</div>}
                    className="pdf-document-root"
                >
                    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
                        <Sidebar
                            showSidebar={showSidebar}
                            numPages={numPages}
                            pageNumber={pageNumber}
                            setPageNumber={setPageNumber}
                            setInputPage={setInputPage}
                            viewMode={viewMode}
                            scrollToPage={scrollToPage}
                            bookmarks={bookmarks}
                        />

                        <PdfContent
                            viewMode={viewMode}
                            pagesToShow={pagesToShow}
                            pageNumber={pageNumber}
                            numPages={numPages}
                            scale={scale}
                            rotation={rotation}
                            searchTerm={searchTerm}
                            onPageLoadSuccess={onPageLoadSuccess}
                            highlightMatches={highlightMatches}
                            containerRef={containerRef}
                        />
                    </div>
                </Document>
            </div>

            {/* <ExtractionModal
                isOpen={isExtractModalOpen}
                onClose={() => setIsExtractModalOpen(false)}
                text={extractedText}
                pageNumber={pageNumber}
            /> */}

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
            `}</style>
        </div>
    );
};

export default PdfViewer;
