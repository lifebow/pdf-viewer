import { pdfjs } from 'react-pdf';

// Single worker setup shared across the app.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export { pdfjs };

// Remote PDFs are fetched through a CORS proxy (same one used by the viewer).
export function getProxiedUrl(originalUrl: string): string {
  if (!originalUrl.startsWith('http')) return originalUrl;
  if (originalUrl.startsWith('blob:')) return originalUrl;
  try {
    const u = new URL(originalUrl);
    if (u.hostname === window.location.hostname) return originalUrl;
    return `https://steep-union-ca07.artmoney306.workers.dev/?url=${encodeURIComponent(originalUrl)}`;
  } catch {
    return originalUrl;
  }
}

/** Render page 1 of a loaded pdf.js document to a JPEG data URL (book cover). */
export async function renderCover(pdf: any, targetWidth = 380): Promise<string> {
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = targetWidth / base.width;
  const vp = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return canvas.toDataURL('image/jpeg', 0.82);
}

/** Load a pdf.js document from a stored blob or a (proxied) url. */
export async function loadPdfDocument(source: { data?: ArrayBuffer; url?: string }): Promise<any> {
  const params = source.data
    ? { data: new Uint8Array(source.data) }
    : { url: getProxiedUrl(source.url!) };
  return pdfjs.getDocument(params as any).promise;
}
