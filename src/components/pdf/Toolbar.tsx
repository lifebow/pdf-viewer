import React from 'react';
import {
    ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw,
    ArrowLeft, Download, Moon, Sun, Search, X, List,
    Layout, Maximize, ChevronUp, PanelLeft, Star, FileText
} from 'lucide-react';

interface ToolbarProps {
    url: string;
    onBack: () => void;
    showSidebar: boolean;
    setShowSidebar: (show: boolean) => void;
    isSearching: boolean;
    setIsSearching: (searching: boolean) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
    searchResults: number[];
    setSearchResults: (results: number[]) => void;
    currentMatchIndex: number;
    navigateMatch: (dir: number) => void;
    changePage: (offset: number) => void;
    pageNumber: number;
    numPages: number | null;
    inputPage: string;
    setInputPage: (val: string) => void;
    handleGoToPage: (e: React.FormEvent) => void;
    viewMode: 'paginated' | 'scroll';
    setViewMode: (mode: 'paginated' | 'scroll') => void;
    pagesToShow: number;
    setPagesToShow: (count: number) => void;
    scale: number;
    setScale: (val: number | ((s: number) => number)) => void;
    scaleMode: 'manual' | 'fit-width' | 'fit-page' | 'original';
    setScaleMode: (mode: 'manual' | 'fit-width' | 'fit-page' | 'original') => void;
    pdfTheme: 'light' | 'dark' | 'sepia' | 'night';
    setPdfTheme: (theme: 'light' | 'dark' | 'sepia' | 'night') => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
    setRotation: (val: number | ((r: number) => number)) => void;
    setIsToolbarVisible: (visible: boolean) => void;
    calculateAutoScale: () => void;
    bookmarks: number[];
    onToggleBookmark: (page: number) => void;
    onExtractText: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
    url, onBack, showSidebar, setShowSidebar,
    isSearching, setIsSearching, searchTerm, setSearchTerm, handleSearch, searchResults, setSearchResults, currentMatchIndex, navigateMatch,
    changePage, pageNumber, numPages, inputPage, setInputPage, handleGoToPage,
    viewMode, setViewMode, pagesToShow, setPagesToShow,
    scale, setScale, scaleMode, setScaleMode,
    pdfTheme, setPdfTheme, isDarkMode, toggleTheme,
    setRotation, setIsToolbarVisible, calculateAutoScale,
    bookmarks, onToggleBookmark, onExtractText
}) => {
    const isBookmarked = bookmarks.includes(pageNumber);
    return (
        <nav className="glass pdf-navbar" style={{ margin: '0.75rem', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={() => setShowSidebar(!showSidebar)} className={`btn-secondary ${showSidebar ? 'active' : ''}`} style={{ padding: '4px' }} title="Bật/Tắt thanh bên">
                    <PanelLeft size={20} />
                </button>
                <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }}></div>
                <button onClick={onBack} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowLeft size={18} /> <span className="nav-label">Quay lại</span>
                </button>
                <div className="mobile-hide" style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }}></div>
                <span className="filename-label" style={{ fontWeight: 600, color: 'var(--text-main)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {url.split('/').pop()}
                </span>
            </div>

            <div className="nav-group" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {/* Search Controls */}
                <div className="glass search-container" style={{ display: 'flex', alignItems: 'center', padding: '0 8px', gap: '4px' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                            <input
                                autoFocus
                                className="input-field search-input"
                                style={{ width: '150px', height: '28px', padding: '2px 8px', fontSize: '0.9rem' }}
                                placeholder="Tìm cụm từ..."
                                value={searchTerm}
                                onChange={handleSearch}
                                data-testid="search-input"
                            />
                            {searchResults.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
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

                {/* Paging Controls */}
                <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '2px 6px' }}>
                    <button onClick={() => changePage(-pagesToShow)} disabled={pageNumber <= 1} className="btn-secondary" style={{ padding: '4px' }} title="Trang trước"><ChevronLeft size={20} /></button>

                    <form onSubmit={handleGoToPage} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                            type="text"
                            value={inputPage}
                            onChange={(e) => setInputPage(e.target.value)}
                            onBlur={() => setInputPage(pageNumber.toString())}
                            style={{ width: '40px', textAlign: 'center', border: 'none', background: 'transparent', color: 'var(--text-main)', borderRadius: '4px', padding: '2px 4px', fontWeight: 600 }}
                        />
                        <span style={{ color: 'var(--text-muted)' }}>/ {numPages || '--'}</span>
                    </form>

                    <button onClick={() => changePage(pagesToShow)} disabled={pageNumber >= (numPages || 0)} className="btn-secondary" style={{ padding: '6px' }} title="Trang sau"><ChevronRight size={20} /></button>

                    <button
                        onClick={() => onToggleBookmark(pageNumber)}
                        className={`btn-secondary ${isBookmarked ? 'active' : ''}`}
                        style={{ padding: '6px', color: isBookmarked ? '#eab308' : 'inherit' }}
                        title={isBookmarked ? "Bỏ đánh dấu trang này" : "Đánh dấu trang này"}
                    >
                        <Star size={20} fill={isBookmarked ? "#eab308" : "none"} />
                    </button>
                </div>

                {/* Mode Controls */}
                <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 8px' }}>
                    <button
                        onClick={() => setViewMode(viewMode === 'paginated' ? 'scroll' : 'paginated')}
                        className="btn-secondary"
                        style={{ padding: '4px' }}
                        title={viewMode === 'paginated' ? "Chế độ cuộn dọc" : "Chế độ chuyển trang"}
                    >
                        {viewMode === 'paginated' ? <List size={20} /> : <Layout size={20} />}
                    </button>

                    {viewMode === 'paginated' && (
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
                    )}
                </div>

                {/* Zoom Controls */}
                <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '2px 6px' }}>
                    <button onClick={() => { setScale(s => Math.max(0.5, s - 0.1)); setScaleMode('manual'); }} className="btn-secondary" style={{ padding: '4px' }} title="Thu nhỏ"><ZoomOut size={18} /></button>
                    <span style={{ minWidth: '45px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 600 }}>
                        {isNaN(scale) || !isFinite(scale) ? '100' : Math.round(scale * 100)}%
                    </span>
                    <button onClick={() => { setScale(s => Math.min(2.5, s + 0.1)); setScaleMode('manual'); }} className="btn-secondary" style={{ padding: '6px' }} title="Phóng to"><ZoomIn size={18} /></button>

                    <button
                        onClick={() => {
                            if (scaleMode === 'manual' || scaleMode === 'original') {
                                setScaleMode('fit-width');
                            } else if (scaleMode === 'fit-width') {
                                setScaleMode('fit-page');
                            } else if (scaleMode === 'fit-page') {
                                setScaleMode('original');
                            }
                        }}
                        className={`btn-secondary ${scaleMode !== 'manual' ? 'active' : ''}`}
                        style={{
                            padding: '6px',
                            color: scaleMode !== 'manual' ? '#3b82f6' : 'inherit',
                            background: scaleMode !== 'manual' ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                        }}
                        title={
                            scaleMode === 'fit-width' ? "Chuyển sang Vừa trang" :
                                scaleMode === 'fit-page' ? "Chuyển sang Gốc" :
                                    "Tự động giãn (Rộng -> Trang -> Gốc)"
                        }
                    >
                        <Maximize size={18} />
                    </button>
                </div>

                {/* Tools & Settings */}
                <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 8px' }}>
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

                    <button onClick={toggleTheme} className="btn-secondary" style={{ padding: '6px' }} title="Đổi giao diện">
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    <button onClick={() => { setRotation(r => (r + 90) % 360); if (scaleMode !== 'manual') setTimeout(calculateAutoScale, 100); }} className="btn-secondary" style={{ padding: '6px' }} title="Xoay trang"><RotateCw size={18} /></button>

                    <button onClick={() => setIsToolbarVisible(false)} className="btn-secondary" style={{ padding: '6px' }} title="Ẩn thanh công cụ">
                        <ChevronUp size={18} />
                    </button>
                </div>
            </div>

            <button onClick={() => window.open(url, '_blank')} className="btn-primary" style={{ padding: '8px 16px' }}>
                <span className="nav-label">Tải xuống</span> <Download size={18} />
            </button>
        </nav>
    );
};

export default Toolbar;
