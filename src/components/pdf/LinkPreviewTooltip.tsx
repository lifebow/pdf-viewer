import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page } from 'react-pdf';

interface AnnotationInfo {
    targetPage: number;
    destY: number | null; // Y coordinate on target page (from top, in PDF units)
}

interface TooltipState {
    visible: boolean;
    targetPage: number | null;
    refText: string | null;
    x: number;
    y: number;
}

interface LinkPreviewTooltipProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    numPages: number | null;
    pdfDocument: any;
}

const LinkPreviewTooltip: React.FC<LinkPreviewTooltipProps> = ({ containerRef, numPages, pdfDocument }) => {
    const [tooltip, setTooltip] = useState<TooltipState>({
        visible: false,
        targetPage: null,
        refText: null,
        x: 0,
        y: 0,
    });
    const tooltipRef = useRef<HTMLDivElement>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Cache: annotation id -> { targetPage, destY }
    const annotationCacheRef = useRef<Map<string, AnnotationInfo>>(new Map());
    // Cache: page number -> text items with positions
    const pageTextCacheRef = useRef<Map<number, Array<{ str: string; y: number; x: number }>>>(new Map());
    const fetchedPagesRef = useRef<Set<number>>(new Set());
    const isBuildingCacheRef = useRef(false);

    // Pre-build the full annotation cache
    const buildFullCache = useCallback(async () => {
        if (!pdfDocument || !numPages || isBuildingCacheRef.current) return;
        isBuildingCacheRef.current = true;

        try {
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                if (fetchedPagesRef.current.has(pageNum)) continue;
                fetchedPagesRef.current.add(pageNum);

                try {
                    const page = await pdfDocument.getPage(pageNum);
                    const annotations = await page.getAnnotations();

                    for (const annot of annotations) {
                        if (annot.subtype === 'Link' && annot.dest) {
                            const dest = annot.dest;
                            if (Array.isArray(dest) && dest.length > 0 && dest[0]) {
                                try {
                                    const pageIndex = await pdfDocument.getPageIndex(dest[0]);
                                    // dest format: [ref, {name: 'XYZ'}, x, y, zoom]
                                    // or [ref, {name: 'Fit'}] etc.
                                    const destY = (dest.length >= 4 && typeof dest[3] === 'number') ? dest[3] : null;
                                    annotationCacheRef.current.set(annot.id, {
                                        targetPage: pageIndex + 1,
                                        destY,
                                    });
                                } catch {
                                    // Could not resolve ref
                                }
                            }
                        }
                    }
                } catch {
                    // Page fetch failed
                }
            }
        } finally {
            isBuildingCacheRef.current = false;
        }
    }, [pdfDocument, numPages]);

    // Extract text items with positions from a page
    const getPageTextItems = useCallback(async (pageNum: number): Promise<Array<{ str: string; y: number; x: number }>> => {
        if (pageTextCacheRef.current.has(pageNum)) {
            return pageTextCacheRef.current.get(pageNum)!;
        }

        if (!pdfDocument) return [];

        try {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1 });
            const pageHeight = viewport.height;

            // textContent.items have transform[4]=x, transform[5]=y (from bottom-left in PDF coords)
            const items: Array<{ str: string; y: number; x: number }> = [];
            for (const item of textContent.items) {
                if ('str' in item && item.str.trim()) {
                    // PDF y is from bottom, convert to from top
                    const yFromTop = pageHeight - item.transform[5];
                    items.push({
                        str: item.str,
                        y: yFromTop,
                        x: item.transform[4],
                    });
                }
            }

            // Sort by y position (top to bottom), then x (left to right)
            items.sort((a, b) => a.y - b.y || a.x - b.x);
            pageTextCacheRef.current.set(pageNum, items);
            return items;
        } catch {
            return [];
        }
    }, [pdfDocument]);

    // Extract reference text near the destination y-coordinate
    const extractRefText = useCallback(async (targetPage: number, destY: number | null): Promise<string | null> => {
        const items = await getPageTextItems(targetPage);
        if (items.length === 0) return null;

        if (destY === null) {
            // No specific y coordinate, return first few lines of the page
            const firstLines = items.slice(0, 10).map(i => i.str).join(' ');
            return firstLines.length > 200 ? firstLines.substring(0, 200) + '...' : firstLines;
        }

        // destY is in PDF coordinates (from bottom), convert to from-top
        // Actually we already converted in getPageTextItems, and destY from dest array is from bottom
        // So we need to find items near the converted position
        // Get page height to convert destY
        let pageHeight = 792; // default letter size
        try {
            const page = await pdfDocument.getPage(targetPage);
            const viewport = page.getViewport({ scale: 1 });
            pageHeight = viewport.height;
        } catch { /* use default */ }

        const targetYFromTop = pageHeight - destY;

        // Find text items at or just below the destination Y position
        // Allow a tolerance window of ~30 PDF units (about 2 lines)
        const tolerance = 5;
        const startIdx = items.findIndex(item => item.y >= targetYFromTop - tolerance);

        if (startIdx === -1) {
            // Destination is below all text, take last few items
            const lastItems = items.slice(-8);
            const text = lastItems.map(i => i.str).join(' ');
            return text.length > 300 ? text.substring(0, 300) + '...' : text;
        }

        // Collect text from destination point downward (~5-8 lines worth)
        // Group by approximate line (items with similar y values)
        const collected: string[] = [];
        let currentLineY = items[startIdx].y;
        let lineCount = 0;
        const maxLines = 6;
        let lineBuffer: string[] = [];

        for (let i = startIdx; i < items.length && lineCount < maxLines; i++) {
            const item = items[i];
            // New line if y differs by more than 5 units
            if (Math.abs(item.y - currentLineY) > 5) {
                if (lineBuffer.length > 0) {
                    collected.push(lineBuffer.join(' '));
                    lineCount++;
                }
                lineBuffer = [item.str];
                currentLineY = item.y;
            } else {
                lineBuffer.push(item.str);
            }
        }
        if (lineBuffer.length > 0 && lineCount < maxLines) {
            collected.push(lineBuffer.join(' '));
        }

        const text = collected.join('\n');
        return text || null;
    }, [pdfDocument, getPageTextItems]);

    // Start building cache when pdfDocument becomes available
    useEffect(() => {
        if (pdfDocument && numPages) {
            buildFullCache();
        }
    }, [pdfDocument, numPages, buildFullCache]);

    // Find the internal link section from a mouse event target
    const findLinkSection = (target: HTMLElement): HTMLElement | null => {
        const section = target.closest('section[data-internal-link]') as HTMLElement | null;
        if (section) return section;

        const linkSection = target.closest('.linkAnnotation') as HTMLElement | null;
        if (linkSection) {
            const anchor = linkSection.querySelector('a[href="#"]') as HTMLAnchorElement | null;
            if (anchor) return linkSection;
        }

        const anchor = target.closest('.annotationLayer a') as HTMLAnchorElement | null;
        if (anchor && anchor.getAttribute('href') === '#') {
            const parentSection = anchor.closest('section') as HTMLElement | null;
            if (parentSection) return parentSection;
        }

        return null;
    };

    const handleMouseEnter = useCallback(async (_target: HTMLElement, section: HTMLElement) => {
        const annotationId = section.getAttribute('data-annotation-id');
        const anchor = section.querySelector('a[data-element-id]') as HTMLAnchorElement | null;
        const elementId = anchor?.getAttribute('data-element-id') || annotationId;

        if (!elementId) return;

        // Clear any pending hide
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }

        const rect = section.getBoundingClientRect();

        // Look up from cache
        const info = annotationCacheRef.current.get(elementId);
        if (!info || !numPages || info.targetPage < 1 || info.targetPage > numPages) return;

        // Extract reference text
        const refText = await extractRefText(info.targetPage, info.destY);

        setTooltip({
            visible: true,
            targetPage: info.targetPage,
            refText,
            x: rect.left + rect.width / 2,
            y: rect.top,
        });
    }, [numPages, extractRefText]);

    const handleMouseLeave = useCallback((e: MouseEvent) => {
        const relatedTarget = e.relatedTarget as HTMLElement | null;
        if (relatedTarget && tooltipRef.current?.contains(relatedTarget)) return;

        hideTimeoutRef.current = setTimeout(() => {
            setTooltip(prev => ({ ...prev, visible: false }));
        }, 300);
    }, []);

    const handleTooltipMouseEnter = useCallback(() => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
    }, []);

    const handleTooltipMouseLeave = useCallback(() => {
        hideTimeoutRef.current = setTimeout(() => {
            setTooltip(prev => ({ ...prev, visible: false }));
        }, 200);
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const section = findLinkSection(target);
            if (section) {
                handleMouseEnter(target, section);
            }
        };

        const onMouseOut = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const section = findLinkSection(target);
            if (section) {
                handleMouseLeave(e);
            }
        };

        container.addEventListener('mouseover', onMouseOver);
        container.addEventListener('mouseout', onMouseOut);

        return () => {
            container.removeEventListener('mouseover', onMouseOver);
            container.removeEventListener('mouseout', onMouseOut);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
    }, [containerRef, handleMouseEnter, handleMouseLeave]);

    // Reset cache when document changes
    useEffect(() => {
        annotationCacheRef.current.clear();
        pageTextCacheRef.current.clear();
        fetchedPagesRef.current.clear();
    }, [pdfDocument]);

    if (!tooltip.visible || !tooltip.targetPage) return null;

    const tooltipStyle: React.CSSProperties = {
        position: 'fixed',
        left: tooltip.x,
        top: tooltip.y,
        transform: 'translate(-50%, -100%)',
        marginTop: '-12px',
        zIndex: 9999,
    };

    return (
        <div
            ref={tooltipRef}
            className="link-preview-tooltip"
            style={tooltipStyle}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
        >
            <div className="link-preview-header">
                Trang {tooltip.targetPage}
            </div>
            {tooltip.refText && (
                <div className="link-preview-ref-text">
                    {tooltip.refText}
                </div>
            )}
            <div className="link-preview-page">
                <Page
                    pageNumber={tooltip.targetPage}
                    scale={0.3}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                />
            </div>
        </div>
    );
};

export default LinkPreviewTooltip;
