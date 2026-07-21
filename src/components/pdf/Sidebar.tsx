import React from 'react';
import type { Highlight } from '../../utils/pdfStorage';

export interface OutlineItem {
  title: string;
  page: number | null;
  depth: number;
}

type Tab = 'toc' | 'bm' | 'hl';

interface SidebarProps {
  tab: Tab;
  setTab: (t: Tab) => void;
  outline: OutlineItem[];
  bookmarks: number[];
  highlights: Highlight[];
  goToPage: (n: number) => void;
  deleteHighlight: (id: string) => void;
}

const tabBase: React.CSSProperties = { flex: 1, height: 36, border: 'none', borderRadius: '9px 9px 0 0', cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const tabStyle = (active: boolean): React.CSSProperties => ({
  ...tabBase,
  background: active ? 'var(--panel)' : 'transparent',
  color: active ? 'var(--ink)' : 'var(--muted)',
});
const empty: React.CSSProperties = { padding: '30px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.6 };

const Sidebar: React.FC<SidebarProps> = ({ tab, setTab, outline, bookmarks, highlights, goToPage, deleteHighlight }) => {
  return (
    <div style={{ width: 290, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', padding: '12px 12px 0', gap: 4 }}>
        <button style={tabStyle(tab === 'toc')} onClick={() => setTab('toc')}>Mục lục</button>
        <button style={tabStyle(tab === 'bm')} onClick={() => setTab('bm')}>Đánh dấu</button>
        <button style={tabStyle(tab === 'hl')} onClick={() => setTab('hl')}>Highlight</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 10px 20px' }}>

        {tab === 'toc' && (
          outline.length > 0 ? outline.map((o, i) => (
            <button
              key={i}
              className="lb-hover-panel"
              onClick={() => { if (o.page) goToPage(o.page); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', paddingLeft: 12 + o.depth * 15, border: 'none', background: 'none', borderRadius: 9, cursor: 'pointer', color: 'var(--ink)', fontSize: 13.5, fontWeight: o.depth === 0 ? 600 : 400, textAlign: 'left' }}
            >
              <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</span>
              <span style={{ color: 'var(--muted)', fontSize: 12, flexShrink: 0 }}>{o.page || ''}</span>
            </button>
          )) : (
            <div style={empty}>Tài liệu này không có mục lục sẵn.<br />Dùng ô nhập số trang để di chuyển nhanh.</div>
          )
        )}

        {tab === 'bm' && (
          bookmarks.length > 0 ? bookmarks.map(b => (
            <button key={b} className="lb-hover-panel" onClick={() => goToPage(b)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '11px 12px', border: 'none', background: 'none', borderRadius: 9, cursor: 'pointer', color: 'var(--ink)', textAlign: 'left' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" /></svg>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Trang {b}</span>
            </button>
          )) : (
            <div style={empty}>Chưa có trang nào được đánh dấu.<br />Nhấn biểu tượng cờ ở thanh trên để lưu trang đang đọc.</div>
          )
        )}

        {tab === 'hl' && (
          highlights.length > 0 ? [...highlights].reverse().map(h => (
            <div key={h.id} style={{ position: 'relative', padding: '12px 12px 12px 14px', borderRadius: 10, marginBottom: 8, background: 'var(--panel)' }}>
              <div onClick={() => goToPage(h.page)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: h.color }} />
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Trang {h.page}</span>
                </div>
                <div className="serif" style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--ink)' }}>{h.text}</div>
              </div>
              <button onClick={() => deleteHighlight(h.id)} title="Xóa" style={{ position: 'absolute', top: 9, right: 9, width: 24, height: 24, border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
          )) : (
            <div style={empty}>Chưa có đoạn nào được bôi màu.<br />Bật bút highlight rồi chọn văn bản trong trang.</div>
          )
        )}

      </div>
    </div>
  );
};

export default Sidebar;
