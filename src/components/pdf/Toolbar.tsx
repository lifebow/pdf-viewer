import React from 'react';
import { TINTS, type TintId } from '../../theme';

interface ToolbarProps {
  onBack: () => void;
  docTitle: string;
  pageNumber: number;
  numPages: number | null;
  inputPage: string;
  setInputPage: (v: string) => void;
  goToPage: (n: number) => void;
  prevPage: () => void;
  nextPage: () => void;
  scalePct: number;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  searchOpen: boolean;
  toggleSearch: () => void;
  isBookmarked: boolean;
  toggleBookmark: () => void;
  toolHl: boolean;
  toggleHl: () => void;
  tintId: TintId;
  setTintId: (id: TintId) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const iconBase: React.CSSProperties = {
  width: 38, height: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border)',
};
const off: React.CSSProperties = { ...iconBase, background: 'var(--surface)', color: 'var(--ink)' };
const on: React.CSSProperties = { ...iconBase, background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' };

const groupBox: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, background: 'var(--panel)', borderRadius: 11, padding: 4 };
const groupBtn: React.CSSProperties = { width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', background: 'none', color: 'var(--ink)', cursor: 'pointer' };
const divider: React.CSSProperties = { width: 1, height: 26, background: 'var(--border)', margin: '0 2px' };

const Toolbar: React.FC<ToolbarProps> = (p) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', zIndex: 10, flexWrap: 'wrap' }}>
      <button onClick={p.onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'none', color: 'var(--ink)', cursor: 'pointer', fontSize: 13.5, fontWeight: 500 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        Thư viện
      </button>
      <div className="serif" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 16.5, fontWeight: 500, paddingLeft: 4 }}>{p.docTitle}</div>

      <div style={{ flex: 1 }} />

      {/* Page navigation */}
      <div style={groupBox}>
        <button onClick={p.prevPage} title="Trang trước" style={groupBtn}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg></button>
        <input
          value={p.inputPage}
          onChange={e => p.setInputPage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') p.goToPage(parseInt(p.inputPage, 10)); }}
          onBlur={() => p.setInputPage(String(p.pageNumber))}
          style={{ width: 44, height: 32, textAlign: 'center', border: 'none', background: 'var(--surface)', borderRadius: 7, fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', outline: 'none' }}
        />
        <span style={{ fontSize: 13, color: 'var(--muted)', padding: '0 6px 0 2px' }}>/ {p.numPages || '--'}</span>
        <button onClick={p.nextPage} title="Trang sau" style={groupBtn}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg></button>
      </div>

      {/* Zoom */}
      <div style={groupBox}>
        <button onClick={p.zoomOut} title="Thu nhỏ" style={groupBtn}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14" /></svg></button>
        <button onClick={p.zoomReset} style={{ ...groupBtn, minWidth: 48, width: 'auto', fontSize: 13, fontWeight: 600 }}>{p.scalePct}%</button>
        <button onClick={p.zoomIn} title="Phóng to" style={groupBtn}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></button>
      </div>

      <div style={divider} />

      <button onClick={p.toggleSearch} title="Tìm kiếm" style={p.searchOpen ? on : off}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg></button>
      <button onClick={p.toggleBookmark} title="Đánh dấu trang" style={p.isBookmarked ? on : off}><svg width="17" height="17" viewBox="0 0 24 24" fill={p.isBookmarked ? '#fff' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" /></svg></button>
      <button onClick={p.toggleHl} title="Bút highlight" style={p.toolHl ? on : off}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11-6 6v3h3l6-6" /><path d="m13 7 4 4" /><path d="M17.5 3.5 21 7l-9 9-3.5-3.5z" /></svg></button>

      <div style={divider} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {TINTS.map(t => (
          <button
            key={t.id}
            onClick={() => p.setTintId(t.id)}
            title={t.name}
            style={{ width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', border: 'none', background: t.sw, boxShadow: t.id === p.tintId ? '0 0 0 2px var(--accent),0 0 0 4px var(--surface)' : 'inset 0 0 0 1px rgba(0,0,0,.12)' }}
          />
        ))}
      </div>

      <div style={divider} />

      <button onClick={p.toggleSidebar} title="Bảng điều khiển" style={p.sidebarOpen ? on : off}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg></button>
    </div>
  );
};

export default Toolbar;
