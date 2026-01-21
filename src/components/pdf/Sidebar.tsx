import React from 'react';
import { Page } from 'react-pdf';
import { Star } from 'lucide-react';

interface SidebarProps {
    showSidebar: boolean;
    numPages: number | null;
    pageNumber: number;
    setPageNumber: (page: number) => void;
    setInputPage: (page: string) => void;
    viewMode: 'paginated' | 'scroll';
    scrollToPage: (pageNum: number) => void;
    bookmarks: number[];
}

export interface SidebarHandle {
    scrollToActive: (smooth?: boolean) => void;
}

const Sidebar = React.forwardRef<SidebarHandle, SidebarProps>(({
    showSidebar,
    numPages,
    pageNumber,
    setPageNumber,
    setInputPage,
    viewMode,
    scrollToPage,
    bookmarks
}, ref) => {
    const sidebarRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => ({
        scrollToActive: (smooth = true) => {
            if (sidebarRef.current) {
                const activeItem = sidebarRef.current.querySelector('.thumbnail-item.active');
                if (activeItem) {
                    activeItem.scrollIntoView({
                        behavior: smooth ? 'smooth' : 'auto',
                        block: 'nearest'
                    });
                }
            }
        }
    }));

    return (
        <div
            ref={sidebarRef}
            className={`sidebar-thumbnails ${showSidebar ? 'open' : 'closed'}`}
        >
            {Array.from({ length: numPages || 0 }).map((_, i) => (
                <div
                    key={`thump-${i + 1}`}
                    className={`thumbnail-item ${pageNumber === i + 1 ? 'active' : ''}`}
                    data-page-number={i + 1}
                    onClick={() => {
                        setPageNumber(i + 1);
                        setInputPage((i + 1).toString());
                        if (viewMode === 'scroll') scrollToPage(i + 1);
                    }}
                >
                    <div className="thumbnail-wrapper" style={{ position: 'relative' }}>
                        <Page
                            pageNumber={i + 1}
                            scale={0.2}
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                        />
                        {bookmarks.includes(i + 1) && (
                            <div style={{ position: 'absolute', top: '4px', right: '4px', color: '#eab308' }}>
                                <Star size={12} fill="#eab308" />
                            </div>
                        )}
                    </div>
                    <div className="thumbnail-page-number">{i + 1}</div>
                </div>
            ))}
        </div>
    );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
