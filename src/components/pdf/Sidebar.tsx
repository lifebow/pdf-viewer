import React from 'react';
import { Page } from 'react-pdf';

interface SidebarProps {
    showSidebar: boolean;
    numPages: number | null;
    pageNumber: number;
    setPageNumber: (page: number) => void;
    setInputPage: (page: string) => void;
    viewMode: 'paginated' | 'scroll';
    scrollToPage: (pageNum: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    showSidebar,
    numPages,
    pageNumber,
    setPageNumber,
    setInputPage,
    viewMode,
    scrollToPage
}) => {
    return (
        <div className={`sidebar-thumbnails ${showSidebar ? 'open' : 'closed'}`}>
            {Array.from({ length: numPages || 0 }).map((_, i) => (
                <div
                    key={`thump-${i + 1}`}
                    className={`thumbnail-item ${pageNumber === i + 1 ? 'active' : ''}`}
                    onClick={() => {
                        setPageNumber(i + 1);
                        setInputPage((i + 1).toString());
                        if (viewMode === 'scroll') scrollToPage(i + 1);
                    }}
                >
                    <div className="thumbnail-wrapper">
                        <Page
                            pageNumber={i + 1}
                            scale={0.2}
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                        />
                    </div>
                    <div className="thumbnail-page-number">{i + 1}</div>
                </div>
            ))}
        </div>
    );
};

export default Sidebar;
