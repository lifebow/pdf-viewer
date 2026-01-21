import React from 'react';
import { X, Copy, Download, Check } from 'lucide-react';

interface ExtractionModalProps {
    isOpen: boolean;
    onClose: () => void;
    text: string;
    pageNumber: number;
}

const ExtractionModal: React.FC<ExtractionModalProps> = ({ isOpen, onClose, text, pageNumber }) => {
    const [copied, setCopied] = React.useState(false);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pdf-extraction-page-${pageNumber}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="modal-overlay fade-in" onClick={onClose}>
            <div className="modal-content glass fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Trích xuất trang {pageNumber}</h3>
                    <button onClick={onClose} className="btn-secondary close-btn"><X size={20} /></button>
                </div>
                <div className="modal-body">
                    <pre className="extracted-text-area">
                        {text}
                    </pre>
                </div>
                <div className="modal-footer">
                    <button onClick={handleCopy} className="btn-secondary">
                        {copied ? <><Check size={18} /> Đã chép</> : <><Copy size={18} /> Sao chép</>}
                    </button>
                    <button onClick={handleDownload} className="btn-primary">
                        <Download size={18} /> Tải .md
                    </button>
                </div>
            </div>

            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                }
                .modal-content {
                    width: 90%;
                    max-width: 600px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    background: var(--surface) !important;
                    padding: 0 !important;
                    overflow: hidden;
                    border-color: var(--primary) !important;
                }
                .modal-header {
                    padding: 1rem 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid var(--glass-border);
                }
                .modal-body {
                    padding: 1.5rem;
                    overflow-y: auto;
                    flex: 1;
                }
                .extracted-text-area {
                    background: rgba(0,0,0,0.05);
                    padding: 1rem;
                    border-radius: 8px;
                    font-family: 'Inter', monospace;
                    font-size: 0.9rem;
                    white-space: pre-wrap;
                    color: var(--text-main);
                    border: 1px solid var(--glass-border);
                }
                .modal-footer {
                    padding: 1rem 1.5rem;
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    border-top: 1px solid var(--glass-border);
                }
                .close-btn {
                    padding: 4px !important;
                    border: none !important;
                }
            `}</style>
        </div>
    );
};

export default ExtractionModal;
