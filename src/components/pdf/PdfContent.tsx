import React from 'react';
import { Page } from 'react-pdf';
import type { Highlight } from '../../utils/pdfStorage';

interface LoadedPdfPage {
  getViewport: (options: { scale: number }) => { width: number; height: number };
}

interface PdfContentProps {
  numPages: number | null;
  scale: number;
  highlights: Highlight[];
  onPageLoadSuccess: (page: LoadedPdfPage) => void;
  onRenderTextLayerSuccess: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onMouseUp: () => void;
}

const PdfContent: React.FC<PdfContentProps> = ({
  numPages, scale, highlights, onPageLoadSuccess, onRenderTextLayerSuccess, containerRef, onMouseUp,
}) => {
  return (
    <div
      ref={containerRef}
      onMouseUp={onMouseUp}
      style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '36px 24px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      {Array.from({ length: numPages || 0 }).map((_, i) => {
        const pageNum = i + 1;
        const pageHls = highlights.filter(h => h.page === pageNum);
        return (
          <div key={pageNum} className="pdf-page-wrapper" data-page-number={pageNum} style={{ position: 'relative', marginBottom: 30 }}>
            <div className="pdf-page-inner" style={{ position: 'relative', display: 'inline-block' }}>
              <Page
                pageNumber={pageNum}
                scale={scale}
                className="pdf-page"
                renderAnnotationLayer={false}
                renderTextLayer={true}
                onLoadSuccess={i === 0 ? onPageLoadSuccess : undefined}
                onRenderTextLayerSuccess={onRenderTextLayerSuccess}
              />
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                {pageHls.map(h => h.rects.map((r, ri) => (
                  <div
                    key={h.id + '-' + ri}
                    style={{ position: 'absolute', left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%`, background: h.color, opacity: 0.45, borderRadius: 2, mixBlendMode: 'multiply' }}
                  />
                )))}
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{pageNum}</div>
          </div>
        );
      })}
    </div>
  );
};

export default PdfContent;
