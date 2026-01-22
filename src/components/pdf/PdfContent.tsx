import React from 'react';
import { Page } from 'react-pdf';

interface PdfContentProps {
    viewMode: 'paginated' | 'scroll';
    pagesToShow: number;
    pageNumber: number;
    numPages: number | null;
    scale: number;
    rotation: number;
    searchTerm: string;
    onPageLoadSuccess: (page: any) => void;
    highlightMatches: () => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

const PdfContent: React.FC<PdfContentProps> = ({
    viewMode,
    pagesToShow,
    pageNumber,
    numPages,
    scale,
    rotation,
    searchTerm,
    onPageLoadSuccess,
    highlightMatches,
    containerRef
}) => {
    return (
        <div
            ref={containerRef}
            style={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: viewMode === 'paginated' ? 'center' : 'flex-start',
                padding: '2rem',
                background: 'var(--pdf-bg)'
            }}
        >
            {viewMode === 'paginated' ? (
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', minWidth: 'min-content' }}>
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
                        <div
                            key={i + 1}
                            data-page-number={i + 1}
                            className={`pdf-page-wrapper ${pageNumber === i + 1 ? 'active' : ''}`}
                        >
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
        </div>
    );
};

export default PdfContent;
